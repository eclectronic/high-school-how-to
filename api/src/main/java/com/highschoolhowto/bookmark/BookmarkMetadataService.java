package com.highschoolhowto.bookmark;

import com.highschoolhowto.bookmark.dto.BookmarkMetadataResponse;
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
public class BookmarkMetadataService {

    private static final int TIMEOUT_SECONDS = 3;
    private static final int MAX_BODY_BYTES = 1_048_576; // 1 MB
    private static final Pattern TITLE_PATTERN = Pattern.compile(
            "<title[^>]*>([^<]+)</title>", Pattern.CASE_INSENSITIVE);
    private static final Pattern OG_TITLE_PATTERN = Pattern.compile(
            "<meta[^>]+property=[\"']og:title[\"'][^>]+content=[\"']([^\"']+)[\"']",
            Pattern.CASE_INSENSITIVE);
    // Matches <link rel="icon|shortcut icon|apple-touch-icon" ... href="...">
    private static final Pattern FAVICON_PATTERN = Pattern.compile(
            "<link[^>]+rel=[\"'][^\"']*(?:shortcut icon|apple-touch-icon|icon)[^\"']*[\"'][^>]+href=[\"']([^\"']+)[\"']",
            Pattern.CASE_INSENSITIVE);

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(TIMEOUT_SECONDS))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    public BookmarkMetadataResponse fetch(String urlStr) {
        validateUrl(urlStr);
        try {
            URI uri = new URI(urlStr);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(uri)
                    .timeout(Duration.ofSeconds(TIMEOUT_SECONDS))
                    .header("User-Agent", "Mozilla/5.0 (compatible; HSHTBot/1.0)")
                    .GET()
                    .build();

            HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
            byte[] rawBody = response.body();
            // Limit to MAX_BODY_BYTES
            int len = Math.min(rawBody.length, MAX_BODY_BYTES);
            String html = new String(rawBody, 0, len, java.nio.charset.StandardCharsets.UTF_8);

            String title = extractTitle(html);
            if (title == null || title.isBlank()) {
                title = uri.getHost();
            }

            String faviconUrl = extractFavicon(html, uri);

            return new BookmarkMetadataResponse(title.trim(), faviconUrl);
        } catch (IOException | InterruptedException e) {
            Thread.currentThread().interrupt();
            // Fallback on network error
            try {
                URI uri = new URI(urlStr);
                return new BookmarkMetadataResponse(uri.getHost(), uri.getScheme() + "://" + uri.getHost() + "/favicon.ico");
            } catch (URISyntaxException ex) {
                return new BookmarkMetadataResponse(urlStr, null);
            }
        } catch (URISyntaxException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid URL", "The provided URL is invalid");
        }
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

        // Block private IP ranges
        try {
            InetAddress addr = InetAddress.getByName(host);
            if (addr.isSiteLocalAddress() || addr.isLoopbackAddress() || addr.isLinkLocalAddress()
                    || addr.isAnyLocalAddress() || addr.isMulticastAddress()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid URL", "Private or reserved addresses are not allowed");
            }
        } catch (java.net.UnknownHostException e) {
            // Unknown host — let the HTTP client handle it (will fail gracefully)
        }
    }

    private String extractTitle(String html) {
        // Try og:title first
        Matcher ogMatcher = OG_TITLE_PATTERN.matcher(html);
        if (ogMatcher.find()) return ogMatcher.group(1);
        // Fall back to <title>
        Matcher titleMatcher = TITLE_PATTERN.matcher(html);
        if (titleMatcher.find()) return titleMatcher.group(1);
        return null;
    }

    private String extractFavicon(String html, URI pageUri) {
        String base = pageUri.getScheme() + "://" + pageUri.getHost();
        Matcher m = FAVICON_PATTERN.matcher(html);
        if (m.find()) {
            String href = m.group(1).trim();
            if (href.startsWith("http://") || href.startsWith("https://")) {
                return href;
            } else if (href.startsWith("//")) {
                return pageUri.getScheme() + ":" + href;
            } else if (href.startsWith("/")) {
                return base + href;
            } else {
                return base + "/" + href;
            }
        }
        // Fall back to /favicon.ico
        return base + "/favicon.ico";
    }
}
