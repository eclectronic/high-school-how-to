package com.highschoolhowto.storage;

import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import com.highschoolhowto.media.MediaAssetService;
import com.highschoolhowto.web.ApiException;

@RestController
@RequestMapping("/api/admin/images")
@PreAuthorize("hasRole('ADMIN')")
public class ImageUploadController {

    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/svg+xml");

    private final StorageService storageService;
    private final ThumbnailService thumbnailService;
    private final MediaAssetService mediaAssetService;

    public ImageUploadController(StorageService storageService, ThumbnailService thumbnailService,
            MediaAssetService mediaAssetService) {
        this.storageService = storageService;
        this.thumbnailService = thumbnailService;
        this.mediaAssetService = mediaAssetService;
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ImageUploadResponse upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "title", required = false) String title) {
        validate(file);
        byte[] originalBytes = readBytes(file);
        String contentType = file.getContentType();
        String canonicalSource = (title != null && !title.isBlank()) ? title : file.getOriginalFilename();
        String filename = storageService.generateFilename(canonicalSource, extensionFor(contentType), "images");
        String imageUrl = storageService.upload(originalBytes, filename, contentType, "images");
        mediaAssetService.recordExisting(imageUrl, file.getOriginalFilename(), contentType, originalBytes.length);

        // SVGs are not rasterizable by thumbnailator — skip thumbnail generation
        String thumbnailUrl = null;
        if (!"image/svg+xml".equals(contentType)) {
            byte[] thumbBytes = thumbnailService.generateThumbnail(originalBytes);
            thumbnailUrl = storageService.upload(thumbBytes, filename, "image/jpeg", "thumbs");
            mediaAssetService.recordExisting(thumbnailUrl, "thumb-" + file.getOriginalFilename(), "image/jpeg", thumbBytes.length);
        }

        return new ImageUploadResponse(imageUrl, thumbnailUrl);
    }

    /**
     * Uploads an image for embedding in article/content body (rich text editor).
     * Stored under the {@code content} subfolder. No thumbnail is generated.
     * Returns a relative URL suitable for use in article HTML.
     */
    @PostMapping(value = "/upload/content", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ImageUploadResponse uploadContentImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "title", required = false) String title) {
        validate(file);
        byte[] originalBytes = readBytes(file);
        String contentType = file.getContentType();
        String canonicalSource = (title != null && !title.isBlank()) ? title : file.getOriginalFilename();
        String filename = storageService.generateFilename(canonicalSource, extensionFor(contentType), "content");
        String imageUrl = storageService.upload(originalBytes, filename, contentType, "content");
        mediaAssetService.recordExisting(imageUrl, file.getOriginalFilename(), contentType, originalBytes.length);
        return new ImageUploadResponse(imageUrl, null);
    }

    /**
     * Uploads a badge icon image. Badge icons are small and do not require
     * thumbnail generation. Stored under the {@code badges} subfolder.
     */
    @PostMapping(value = "/upload/badges", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ImageUploadResponse uploadBadgeIcon(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "title", required = false) String title) {
        validate(file);
        byte[] originalBytes = readBytes(file);
        String contentType = file.getContentType();
        String canonicalSource = (title != null && !title.isBlank()) ? title : file.getOriginalFilename();
        String filename = storageService.generateFilename(canonicalSource, extensionFor(contentType), "badges");
        String imageUrl = storageService.upload(originalBytes, filename, contentType, "badges");
        mediaAssetService.recordExisting(imageUrl, file.getOriginalFilename(), contentType, originalBytes.length);
        return new ImageUploadResponse(imageUrl, null);
    }

    @ExceptionHandler(FilenameConflictException.class)
    public ResponseEntity<Map<String, String>> handleFilenameConflict(FilenameConflictException ex) {
        String key = ex.getKey();
        // Extract just the filename portion from the key (e.g. "images/foo.jpeg" -> "foo.jpeg")
        String filename = key.contains("/") ? key.substring(key.lastIndexOf('/') + 1) : key;
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "error", "Filename conflict",
                "message", "An image named '" + filename + "' already exists.",
                "existingUrl", ex.getExistingUrl()
        ));
    }

    private byte[] readBytes(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Upload failed", "Could not read uploaded file");
        }
    }

    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid file", "No file provided");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "File too large", "Maximum file size is 10 MB");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Unsupported file type",
                    "Allowed types: JPEG, PNG, WebP, SVG");
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
