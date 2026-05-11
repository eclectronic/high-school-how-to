package com.highschoolhowto.storage;

import java.util.List;
import java.util.UUID;

public interface StorageService {

    String upload(byte[] data, String filename, String contentType, String subfolder);

    /**
     * Returns true if an object with the given key already exists in storage.
     * The key is relative to the storage root (e.g. "images/foo.jpeg").
     */
    boolean objectExists(String key);

    /**
     * Generates a UUID-based filename. Kept for callers that haven't been updated
     * to the canonical-name based variant.
     */
    default String generateFilename(String extension) {
        return UUID.randomUUID() + "." + extension;
    }

    /**
     * Generates a filename derived from {@code canonicalName} (e.g. a content title or
     * original filename). The name is sanitized to lowercase alphanumeric + hyphens and
     * truncated to 64 characters. If an object with the resulting key already exists under
     * {@code subfolder}, throws {@link FilenameConflictException}.
     *
     * @param canonicalName source name to derive the base from (title, original filename, etc.)
     * @param extension     file extension without leading dot (e.g. "jpeg")
     * @param subfolder     storage subfolder (e.g. "images", "content", "badges")
     * @return the candidate filename (base + "." + extension)
     * @throws FilenameConflictException if a file with the same name already exists
     */
    default String generateFilename(String canonicalName, String extension, String subfolder) {
        String sanitizedBase = sanitizeBaseName(canonicalName);

        String candidate = sanitizedBase + "." + extension;
        String key = subfolder + "/" + candidate;
        if (objectExists(key)) {
            throw new FilenameConflictException(key, buildPublicUrl("uploads/" + key));
        }
        return candidate;
    }

    /**
     * Sanitizes a raw name into a URL-safe lowercase slug suitable for use as a filename base.
     * <ol>
     *   <li>Strips any path separators (everything up to and including the last {@code /} or {@code \})</li>
     *   <li>Drops the file extension (everything after the last {@code .})</li>
     *   <li>Lowercases the result</li>
     *   <li>Replaces runs of characters that are not {@code [a-z0-9-]} with a single {@code -}</li>
     *   <li>Trims leading and trailing {@code -}</li>
     *   <li>Truncates to 64 characters</li>
     *   <li>Falls back to {@code "image"} if the result is empty</li>
     * </ol>
     */
    private static String sanitizeBaseName(String canonicalName) {
        if (canonicalName == null || canonicalName.isBlank()) {
            return "image";
        }

        // Strip path separators
        String name = canonicalName;
        int lastSlash = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'));
        if (lastSlash >= 0) {
            name = name.substring(lastSlash + 1);
        }

        // Drop extension
        int lastDot = name.lastIndexOf('.');
        if (lastDot > 0) {
            name = name.substring(0, lastDot);
        }

        // Lowercase, replace non-[a-z0-9-] runs with single hyphen, trim, truncate
        name = name.toLowerCase()
                .replaceAll("[^a-z0-9-]+", "-")
                .replaceAll("^-+|-+$", "");

        if (name.length() > 64) {
            name = name.substring(0, 64).replaceAll("-+$", "");
        }

        return name.isEmpty() ? "image" : name;
    }

    String keyPrefix(String subfolder);

    int countObjects(String prefix);

    void delete(String urlOrKey);

    String buildPublicUrl(String key);

    /**
     * Lists all stored objects available to this backend.
     * Implementations that cannot enumerate their storage may throw {@link UnsupportedOperationException}.
     */
    default List<StoredObject> listAll() {
        throw new UnsupportedOperationException("listAll not supported by this storage backend");
    }

    record StoredObject(String key, long sizeBytes) {}
}
