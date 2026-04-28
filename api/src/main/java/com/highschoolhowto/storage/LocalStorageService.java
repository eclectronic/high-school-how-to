package com.highschoolhowto.storage;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

/**
 * Local filesystem storage for dev environments. Writes uploads to the media directory
 * mounted at storage.local.media-path, returning relative /media/... URLs served by
 * the Angular dev server via the shared Docker volume.
 */
@Service
@ConditionalOnProperty(name = "storage.local.enabled", havingValue = "true")
public class LocalStorageService implements StorageService {

    private static final Logger log = LoggerFactory.getLogger(LocalStorageService.class);

    private final String mediaPath;
    private final String urlPrefix;

    public LocalStorageService(
            @Value("${storage.local.media-path:/workspace/media}") String mediaPath,
            @Value("${storage.local.url-prefix:/media/}") String urlPrefix) {
        this.mediaPath = mediaPath;
        this.urlPrefix = urlPrefix;
    }

    @Override
    public String upload(byte[] data, String filename, String contentType, String subfolder) {
        String key = "uploads/" + subfolder + "/" + filename;
        Path dest = Paths.get(mediaPath, "uploads", subfolder, filename);
        try {
            Files.createDirectories(dest.getParent());
            Files.write(dest, data);
            log.info("Saved {} bytes to {}", data.length, dest);
            return buildPublicUrl(key);
        } catch (IOException ex) {
            log.error("Failed to write file to {}: {}", dest, ex.getMessage(), ex);
            throw new StorageException("Failed to write file locally", ex);
        }
    }

    @Override
    public String keyPrefix(String subfolder) {
        return "uploads/" + subfolder;
    }

    @Override
    public int countObjects(String prefix) {
        Path dir = Paths.get(mediaPath, prefix);
        if (!Files.isDirectory(dir)) {
            return 0;
        }
        try (var stream = Files.list(dir)) {
            return (int) stream.filter(Files::isRegularFile).count();
        } catch (IOException ex) {
            log.warn("Failed to count files under {}: {}", dir, ex.getMessage());
            return 0;
        }
    }

    @Override
    public void delete(String urlOrKey) {
        String key = urlOrKey.startsWith(urlPrefix)
                ? urlOrKey.substring(urlPrefix.length())
                : urlOrKey;
        Path file = Paths.get(mediaPath, key);
        try {
            Files.deleteIfExists(file);
            log.info("Deleted local file {}", file);
        } catch (IOException ex) {
            log.warn("Failed to delete local file {}: {}", file, ex.getMessage());
        }
    }

    @Override
    public String buildPublicUrl(String key) {
        return urlPrefix + key;
    }
}
