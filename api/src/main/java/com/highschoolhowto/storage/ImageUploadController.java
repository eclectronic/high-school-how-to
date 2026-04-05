package com.highschoolhowto.storage;

import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import com.highschoolhowto.web.ApiException;

@RestController
@RequestMapping("/api/admin/images")
@PreAuthorize("hasRole('ADMIN')")
public class ImageUploadController {

    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/svg+xml");

    private final S3StorageService s3StorageService;
    private final ThumbnailService thumbnailService;

    public ImageUploadController(S3StorageService s3StorageService, ThumbnailService thumbnailService) {
        this.s3StorageService = s3StorageService;
        this.thumbnailService = thumbnailService;
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ImageUploadResponse upload(@RequestParam("file") MultipartFile file) {
        validate(file);

        byte[] originalBytes;
        try {
            originalBytes = file.getBytes();
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Upload failed", "Could not read uploaded file");
        }

        String contentType = file.getContentType();
        String extension = extensionFor(contentType);
        String filename = s3StorageService.generateFilename(extension);

        String imageUrl = s3StorageService.upload(originalBytes, filename, contentType, "images");

        // SVGs are not rasterizable by thumbnailator — skip thumbnail generation
        String thumbnailUrl = null;
        if (!"image/svg+xml".equals(contentType)) {
            byte[] thumbBytes = thumbnailService.generateThumbnail(originalBytes);
            thumbnailUrl = s3StorageService.upload(thumbBytes, filename, "image/jpeg", "thumbs");
        }

        return new ImageUploadResponse(imageUrl, thumbnailUrl);
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
