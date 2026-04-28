package com.highschoolhowto.storage;

import java.util.UUID;

public interface StorageService {

    String upload(byte[] data, String filename, String contentType, String subfolder);

    default String generateFilename(String extension) {
        return UUID.randomUUID() + "." + extension;
    }

    String keyPrefix(String subfolder);

    int countObjects(String prefix);

    void delete(String urlOrKey);

    String buildPublicUrl(String key);
}
