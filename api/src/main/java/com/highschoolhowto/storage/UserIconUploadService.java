package com.highschoolhowto.storage;

import com.highschoolhowto.web.ApiException;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Set;
import java.util.UUID;
import net.coobird.thumbnailator.Thumbnails;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Handles validation, resizing, and S3 storage of user-uploaded icon images.
 * Icons are stored at {@code media/icons/{userId}/{uuid}.{ext}} and served via
 * CloudFront in production. Per-user limit is enforced by listing existing
 * objects under the user's S3 prefix.
 */
@Service
public class UserIconUploadService {

    static final long MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
    static final int MAX_ICONS_PER_USER = 100;
    static final int MAX_ICON_DIMENSION = 256;
    static final String ICONS_SUBFOLDER = "icons";

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/svg+xml");

    private final S3StorageService s3StorageService;

    public UserIconUploadService(S3StorageService s3StorageService) {
        this.s3StorageService = s3StorageService;
    }

    public String uploadIcon(MultipartFile file, UUID userId) {
        validate(file);
        enforcePerUserLimit(userId);

        byte[] bytes = readBytes(file);
        String contentType = file.getContentType();
        String extension = extensionFor(contentType);

        byte[] toUpload = "image/svg+xml".equals(contentType)
                ? bytes
                : resize(bytes);

        String filename = s3StorageService.generateFilename(extension);
        String subfolder = ICONS_SUBFOLDER + "/" + userId;
        return s3StorageService.upload(toUpload, filename, contentType, subfolder);
    }

    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST, "Invalid file", "No file provided");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "File too large",
                    "Maximum icon file size is 2 MB");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new ApiException(
                    HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "Unsupported file type",
                    "Allowed types: JPEG, PNG, WebP, SVG");
        }
    }

    private void enforcePerUserLimit(UUID userId) {
        String prefix = s3StorageService.keyPrefix(ICONS_SUBFOLDER + "/" + userId + "/");
        int count = s3StorageService.countObjects(prefix);
        if (count >= MAX_ICONS_PER_USER) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Upload limit reached",
                    "You have reached the maximum of " + MAX_ICONS_PER_USER + " uploaded icons");
        }
    }

    private byte[] readBytes(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException ex) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST, "Upload failed", "Could not read uploaded file");
        }
    }

    private byte[] resize(byte[] original) {
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            Thumbnails.of(new ByteArrayInputStream(original))
                    .size(MAX_ICON_DIMENSION, MAX_ICON_DIMENSION)
                    .keepAspectRatio(true)
                    .outputQuality(0.9)
                    .toOutputStream(out);
            return out.toByteArray();
        } catch (IOException ex) {
            throw new StorageException("Failed to resize icon", ex);
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
