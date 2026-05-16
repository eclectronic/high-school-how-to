package com.highschoolhowto.media;

import com.highschoolhowto.storage.StorageService;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * Scans the storage backend for files not yet represented in media_assets and inserts rows.
 * Runs once per startup; idempotent because findByUrl short-circuits duplicates.
 * Complements the SQL backfill (0081) which seeds from content_card URL columns.
 */
@Component
public class MediaBackfillRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(MediaBackfillRunner.class);

    private final StorageService storageService;
    private final MediaAssetRepository repo;

    public MediaBackfillRunner(StorageService storageService, MediaAssetRepository repo) {
        this.storageService = storageService;
        this.repo = repo;
    }

    @Override
    public void run(ApplicationArguments args) {
        List<StorageService.StoredObject> objects;
        try {
            objects = storageService.listAll();
        } catch (UnsupportedOperationException ex) {
            log.debug("Storage backend does not support listAll — skipping media backfill scan");
            return;
        } catch (Exception ex) {
            log.warn("Media backfill scan failed: {}", ex.getMessage());
            return;
        }

        int inserted = 0;
        for (StorageService.StoredObject obj : objects) {
            String url = storageService.buildPublicUrl(obj.key());
            if (!repo.existsByUrl(url)) {
                MediaAsset asset = new MediaAsset();
                asset.setUrl(url);
                asset.setFilename(obj.key().contains("/") ? obj.key().substring(obj.key().lastIndexOf('/') + 1) : obj.key());
                asset.setSizeBytes(obj.sizeBytes());
                asset.setMimeType(guessMimeType(obj.key()));
                repo.save(asset);
                inserted++;
            }
        }
        if (inserted > 0) log.info("Media backfill: inserted {} new asset rows from storage scan", inserted);
    }

    private String guessMimeType(String key) {
        String lower = key.toLowerCase();
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".pdf")) return "application/pdf";
        return "application/octet-stream";
    }
}
