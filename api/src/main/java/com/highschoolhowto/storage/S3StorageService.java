package com.highschoolhowto.storage;

import com.highschoolhowto.config.StorageProperties;
import java.io.IOException;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

@Service
public class S3StorageService {

    private static final Logger log = LoggerFactory.getLogger(S3StorageService.class);

    private final S3Client s3Client;
    private final StorageProperties properties;

    public S3StorageService(StorageProperties properties) {
        this.properties = properties;
        this.s3Client = S3Client.builder()
                .region(Region.of(properties.getRegion()))
                .build();
    }

    /**
     * Uploads bytes to S3 under the configured upload prefix.
     *
     * @param data        raw bytes to upload
     * @param filename    filename with extension (e.g. "abc123.jpeg")
     * @param contentType MIME type (e.g. "image/jpeg")
     * @param subfolder   subfolder under upload prefix (e.g. "images" or "thumbs")
     * @return public URL of the uploaded object
     */
    public String upload(byte[] data, String filename, String contentType, String subfolder) {
        String key = properties.getUploadPrefix() + subfolder + "/" + filename;
        PutObjectRequest request = PutObjectRequest.builder()
                .bucket(properties.getBucket())
                .key(key)
                .contentType(contentType)
                .contentLength((long) data.length)
                .build();
        try {
            s3Client.putObject(request, RequestBody.fromBytes(data));
            log.info("Uploaded {} bytes to s3://{}/{}", data.length, properties.getBucket(), key);
            return buildPublicUrl(key);
        } catch (Exception ex) {
            log.error("Failed to upload to S3 key {}: {}", key, ex.getMessage(), ex);
            throw new StorageException("Failed to upload file to S3", ex);
        }
    }

    /**
     * Generates a unique filename with the given extension.
     */
    public String generateFilename(String extension) {
        return UUID.randomUUID() + "." + extension;
    }

    public String keyPrefix(String subfolder) {
        return properties.getUploadPrefix() + subfolder;
    }

    /**
     * Counts the number of objects under a given S3 prefix (i.e. folder).
     *
     * @param prefix the S3 key prefix to list (e.g. "media/icons/user-id/")
     * @return count of objects under that prefix
     */
    public int countObjects(String prefix) {
        try {
            ListObjectsV2Request request = ListObjectsV2Request.builder()
                    .bucket(properties.getBucket())
                    .prefix(prefix)
                    .maxKeys(101)
                    .build();
            return s3Client.listObjectsV2(request).keyCount();
        } catch (Exception ex) {
            log.error("Failed to list S3 objects under prefix {}: {}", prefix, ex.getMessage(), ex);
            throw new StorageException("Failed to count objects in S3", ex);
        }
    }

    /**
     * Deletes an object from S3 by its full public URL or key path.
     * Accepts either a full URL or a key (path within the bucket).
     */
    public void delete(String urlOrKey) {
        String key = extractKey(urlOrKey);
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(properties.getBucket())
                    .key(key)
                    .build());
            log.info("Deleted s3://{}/{}", properties.getBucket(), key);
        } catch (Exception ex) {
            log.warn("Failed to delete S3 key {}: {}", key, ex.getMessage());
        }
    }

    /**
     * Builds the public URL for an S3 key. Uses CDN base URL if configured,
     * otherwise falls back to the S3 path-style URL.
     */
    public String buildPublicUrl(String key) {
        if (properties.getCdnBaseUrl() != null && !properties.getCdnBaseUrl().isBlank()) {
            return properties.getCdnBaseUrl().stripTrailing() + "/" + key;
        }
        return String.format("https://%s.s3.%s.amazonaws.com/%s",
                properties.getBucket(), properties.getRegion(), key);
    }

    private String extractKey(String urlOrKey) {
        String baseUrl = buildPublicUrl("");
        if (urlOrKey.startsWith("https://") && urlOrKey.contains(properties.getBucket())) {
            int bucketIndex = urlOrKey.indexOf(properties.getBucket());
            return urlOrKey.substring(bucketIndex + properties.getBucket().length() + 1);
        }
        return urlOrKey;
    }
}
