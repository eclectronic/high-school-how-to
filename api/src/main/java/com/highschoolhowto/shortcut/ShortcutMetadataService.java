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
    private static final Pattern OG_TITLE_PATTERN = Pattern.compile(
            "<meta[^>]+property=[\"']og:title[\"'][^>]+content=[\"']([^\"']+)[\"']",
            Pattern.CASE_INSENSITIVE);

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

        // Favicon: use the final URI's domain after following redirects.
        // e.g. gmail.com → mail.google.com → Gmail "M" icon, not Google "G".
        URI faviconSourceUri = (page != null) ? page.finalUri() : originUri;
        String faviconUrl = googleFaviconUrl(faviconSourceUri);

        // Title: only trust the scraped title when the page didn't redirect us to a
        // completely different domain (e.g. login pages).
        String title = null;
        if (page != null && sameRegistrableDomain(originUri, page.finalUri())) {
            title = extractTitle(page.html());
        }
        if (title == null || title.isBlank()) {
            title = originUri.getHost();
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
        Matcher ogMatcher = OG_TITLE_PATTERN.matcher(html);
        if (ogMatcher.find()) return ogMatcher.group(1);
        Matcher titleMatcher = TITLE_PATTERN.matcher(html);
        if (titleMatcher.find()) return titleMatcher.group(1);
        return null;
    }

    private static String googleFaviconUrl(URI uri) {
        return "https://www.google.com/s2/favicons?sz=64&domain_url=" + uri.getScheme() + "://" + uri.getHost();
    }
}
