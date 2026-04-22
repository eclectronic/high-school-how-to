package com.highschoolhowto.shortcut;

import com.highschoolhowto.shortcut.dto.ShortcutMetadataResponse;
import com.highschoolhowto.web.ApiException;
import java.io.IOException;
import java.net.InetAddress;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class ShortcutMetadataService {

    private static final int TIMEOUT_SECONDS = 5;
    private static final int MAX_BODY_BYTES = 512_000; // 512 KB — enough for <head>

    private static final Pattern TITLE_PATTERN = Pattern.compile(
            "<title[^>]*>([^<]+)</title>", Pattern.CASE_INSENSITIVE);
    // og:title — handle both attribute orderings (property-first and content-first)
    private static final Pattern OG_TITLE_PROP_FIRST = Pattern.compile(
            "<meta[^>]+property=[\"']og:title[\"'][^>]+content=[\"']([^\"']+)[\"']",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern OG_TITLE_CONTENT_FIRST = Pattern.compile(
            "<meta[^>]+content=[\"']([^\"']+)[\"'][^>]+property=[\"']og:title[\"']",
            Pattern.CASE_INSENSITIVE);

    // When a URL redirects to one of these hosts it has landed on a login page —
    // the scraped title would be something like "Sign in – Google Accounts", which
    // is useless. Skip extraction and fall back to the known-titles map instead.
    private static final Set<String> AUTH_DOMAINS = Set.of(
            "accounts.google.com",
            "login.microsoft.com",
            "login.live.com",
            "signin.aws.amazon.com",
            "auth.atlassian.com"
    );

    // Well-known titles for sites that always redirect unauthenticated bots to login.
    private static final Map<String, String> KNOWN_TITLES = Map.ofEntries(
            Map.entry("calendar.google.com",  "Google Calendar"),
            Map.entry("drive.google.com",     "Google Drive"),
            Map.entry("docs.google.com",      "Google Docs"),
            Map.entry("sheets.google.com",    "Google Sheets"),
            Map.entry("slides.google.com",    "Google Slides"),
            Map.entry("mail.google.com",      "Gmail"),
            Map.entry("gmail.com",            "Gmail"),
            Map.entry("meet.google.com",      "Google Meet"),
            Map.entry("classroom.google.com", "Google Classroom"),
            Map.entry("youtube.com",          "YouTube"),
            Map.entry("www.youtube.com",      "YouTube")
    );

    private static final String GSTATIC = "https://ssl.gstatic.com/images/branding/product/2x/";

    // Known favicon URLs for services where the favicon service returns the wrong icon.
    // Google product icons use ssl.gstatic.com; Classroom and Scholar use bundled local assets
    // since they are not in Google's standard product branding set.
    private static final Map<String, String> KNOWN_FAVICONS = Map.ofEntries(
            Map.entry("gmail.com",            GSTATIC + "gmail_2020q4_48dp.png"),
            Map.entry("mail.google.com",      GSTATIC + "gmail_2020q4_48dp.png"),
            Map.entry("calendar.google.com",  GSTATIC + "calendar_2020q4_48dp.png"),
            Map.entry("drive.google.com",     GSTATIC + "drive_2020q4_48dp.png"),
            Map.entry("docs.google.com",      GSTATIC + "docs_2020q4_48dp.png"),
            Map.entry("sheets.google.com",    GSTATIC + "sheets_2020q4_48dp.png"),
            Map.entry("slides.google.com",    GSTATIC + "slides_2020q4_48dp.png"),
            Map.entry("meet.google.com",      GSTATIC + "meet_2020q4_48dp.png"),
            Map.entry("youtube.com",          GSTATIC + "youtube_2020q4_48dp.png"),
            Map.entry("www.youtube.com",      GSTATIC + "youtube_2020q4_48dp.png"),
            Map.entry("classroom.google.com", "/assets/favicons/google-classroom.png"),
            Map.entry("scholar.google.com",   "/assets/favicons/google-scholar.png")
    );

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(TIMEOUT_SECONDS))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    private record PageResult(URI finalUri, String html) {}

    public ShortcutMetadataResponse fetch(String urlStr) {
        validateUrl(urlStr);
        URI originUri;
        try {
            originUri = new URI(urlStr);
        } catch (URISyntaxException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid URL", "The provided URL is invalid");
        }

        PageResult page = fetchPage(originUri);

        // Favicon: prefer bundled local asset, then fall back to Google's favicon API.
        // Use the original URI's host for the lookup so calendar.google.com gets the
        // Calendar icon even when the request redirects to accounts.google.com.
        String faviconUrl = KNOWN_FAVICONS.getOrDefault(
                originUri.getHost(),
                googleFaviconUrl((page != null) ? page.finalUri() : originUri));

        // Title: skip scraped title if the page redirected to a known auth/login domain.
        // Fall back to the known-titles map, then the original hostname.
        String originHost = originUri.getHost();
        String title = null;
        boolean redirectedToAuth = page != null && AUTH_DOMAINS.contains(page.finalUri().getHost());
        if (page != null && !redirectedToAuth && sameRegistrableDomain(originUri, page.finalUri())) {
            title = extractTitle(page.html());
        }
        if (title == null || title.isBlank()) {
            title = KNOWN_TITLES.getOrDefault(originHost, originHost);
        }

        return new ShortcutMetadataResponse(title.trim(), faviconUrl);
    }

    private PageResult fetchPage(URI uri) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(uri)
                    .timeout(Duration.ofSeconds(TIMEOUT_SECONDS))
                    .header("User-Agent", "Mozilla/5.0 (compatible; HSHTBot/1.0)")
                    .GET()
                    .build();

            HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());

            byte[] rawBody = response.body();
            int len = Math.min(rawBody.length, MAX_BODY_BYTES);
            String html = new String(rawBody, 0, len, java.nio.charset.StandardCharsets.UTF_8);
            return new PageResult(response.uri(), html);

        } catch (IOException | InterruptedException e) {
            Thread.currentThread().interrupt();
            return null;
        }
    }

    /**
     * Returns true when two URIs share the same registrable domain (last two labels).
     * e.g. mail.google.com and accounts.google.com → true (both google.com)
     *      gmail.com and accounts.google.com       → false
     */
    private static boolean sameRegistrableDomain(URI a, URI b) {
        String ha = a.getHost();
        String hb = b.getHost();
        if (ha == null || hb == null) return false;
        return registrableDomain(ha).equalsIgnoreCase(registrableDomain(hb));
    }

    private static String registrableDomain(String host) {
        String[] parts = host.split("\\.");
        if (parts.length <= 2) return host;
        return parts[parts.length - 2] + "." + parts[parts.length - 1];
    }

    private void validateUrl(String urlStr) {
        URI uri;
        try {
            uri = new URI(urlStr);
        } catch (URISyntaxException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid URL", "The provided URL is not a valid URI");
        }

        String scheme = uri.getScheme();
        if (scheme == null || (!scheme.equals("http") && !scheme.equals("https"))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid URL", "Only http and https URLs are allowed");
        }

        String host = uri.getHost();
        if (host == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid URL", "URL must have a valid host");
        }
        if (host.equalsIgnoreCase("localhost") || host.equals("127.0.0.1") || host.equals("::1")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid URL", "Local addresses are not allowed");
        }

        try {
            InetAddress addr = InetAddress.getByName(host);
            if (addr.isSiteLocalAddress() || addr.isLoopbackAddress() || addr.isLinkLocalAddress()
                    || addr.isAnyLocalAddress() || addr.isMulticastAddress()) {
                throw new ApiException(
                        HttpStatus.BAD_REQUEST,
                        "Invalid URL",
                        "Private or reserved addresses are not allowed");
            }
        } catch (java.net.UnknownHostException e) {
            // Unknown host — let the HTTP client handle it (will fail gracefully)
        }
    }

    private String extractTitle(String html) {
        Matcher m;
        m = OG_TITLE_PROP_FIRST.matcher(html);
        if (m.find()) return m.group(1);
        m = OG_TITLE_CONTENT_FIRST.matcher(html);
        if (m.find()) return m.group(1);
        m = TITLE_PATTERN.matcher(html);
        if (m.find()) return m.group(1);
        return null;
    }

    private static String googleFaviconUrl(URI uri) {
        return "https://www.google.com/s2/favicons?sz=64&domain_url=" + uri.getScheme() + "://" + uri.getHost();
    }
}
