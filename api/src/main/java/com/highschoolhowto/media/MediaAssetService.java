package com.highschoolhowto.media;

import com.highschoolhowto.storage.StorageService;
import com.highschoolhowto.web.ApiException;
import java.io.ByteArrayInputStream;
import java.util.List;
import javax.imageio.ImageIO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class MediaAssetService {

    private static final Logger log = LoggerFactory.getLogger(MediaAssetService.class);

    private final MediaAssetRepository repo;
    private final StorageService storageService;
    private final JdbcTemplate jdbc;

    public MediaAssetService(MediaAssetRepository repo, StorageService storageService, JdbcTemplate jdbc) {
        this.repo = repo;
        this.storageService = storageService;
        this.jdbc = jdbc;
    }

    public Page<MediaAssetResponse> list(String search, boolean imagesOnly, Pageable pageable) {
        var page = imagesOnly ? repo.searchImages(search, pageable) : repo.search(search, pageable);
        return page.map(MediaAssetResponse::from);
    }

    @Transactional
    public MediaAssetResponse upload(MultipartFile file, String subfolder) {
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Upload failed", "Could not read uploaded file");
        }

        String contentType = file.getContentType() != null ? file.getContentType() : "application/octet-stream";
        String extension = extensionFor(contentType);
        String filename = storageService.generateFilename(extension);
        String url = storageService.upload(bytes, filename, contentType, subfolder);

        MediaAsset asset = new MediaAsset();
        asset.setUrl(url);
        asset.setFilename(file.getOriginalFilename() != null ? file.getOriginalFilename() : filename);
        asset.setMimeType(contentType);
        asset.setSizeBytes((long) bytes.length);

        readDimensions(bytes, contentType, asset);

        return MediaAssetResponse.from(repo.save(asset));
    }

    @Transactional
    public MediaAssetResponse recordExisting(String url, String filename, String mimeType, long sizeBytes) {
        return repo.findByUrl(url).map(MediaAssetResponse::from).orElseGet(() -> {
            MediaAsset asset = new MediaAsset();
            asset.setUrl(url);
            asset.setFilename(filename);
            asset.setMimeType(mimeType);
            asset.setSizeBytes(sizeBytes);
            return MediaAssetResponse.from(repo.save(asset));
        });
    }

    @Transactional
    public MediaAssetResponse patch(Long id, PatchMediaAssetRequest req) {
        MediaAsset asset = repo.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Not found", "Media asset not found"));
        if (req.altText() != null) asset.setAltText(req.altText());
        if (req.filename() != null) asset.setFilename(req.filename());
        return MediaAssetResponse.from(repo.save(asset));
    }

    @Transactional
    public void delete(Long id) {
        MediaAsset asset = repo.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Not found", "Media asset not found"));

        MediaUsageResponse usage = usage(id);
        if (usage.count() > 0) {
            throw new ApiException(HttpStatus.CONFLICT, "Asset in use",
                    "This image is used by " + usage.count() + " content card(s) and cannot be deleted");
        }

        try {
            storageService.delete(asset.getUrl());
        } catch (Exception ex) {
            log.warn("Storage delete failed for {}: {}", asset.getUrl(), ex.getMessage());
        }
        repo.delete(asset);
    }

    public MediaUsageResponse usage(Long id) {
        MediaAsset asset = repo.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Not found", "Media asset not found"));
        String url = asset.getUrl();

        List<MediaUsageResponse.CardRef> cards = jdbc.query("""
                SELECT DISTINCT id, slug, title FROM content_cards
                WHERE thumbnail_url = ?
                   OR cover_image_url = ?
                   OR media_url = ?
                   OR print_media_url = ?
                   OR media_urls::text LIKE ?
                   OR body_html LIKE ?
                LIMIT 20
                """,
                (rs, n) -> new MediaUsageResponse.CardRef(rs.getLong("id"), rs.getString("slug"), rs.getString("title")),
                url, url, url, url, "%" + url + "%", "%" + url + "%");

        return new MediaUsageResponse(cards.size(), cards);
    }

    private void readDimensions(byte[] bytes, String mimeType, MediaAsset asset) {
        if ("image/svg+xml".equals(mimeType)) return;
        try {
            var img = ImageIO.read(new ByteArrayInputStream(bytes));
            if (img != null) {
                asset.setWidth(img.getWidth());
                asset.setHeight(img.getHeight());
            }
        } catch (Exception ex) {
            log.debug("Could not read image dimensions: {}", ex.getMessage());
        }
    }

    private String extensionFor(String contentType) {
        return switch (contentType) {
            case "image/jpeg" -> "jpeg";
            case "image/png" -> "png";
            case "image/webp" -> "webp";
            case "image/svg+xml" -> "svg";
            default -> "bin";
        };
    }
}
