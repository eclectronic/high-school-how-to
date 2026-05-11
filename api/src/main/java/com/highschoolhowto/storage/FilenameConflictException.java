package com.highschoolhowto.storage;

public class FilenameConflictException extends RuntimeException {
    private final String key;
    private final String existingUrl;

    public FilenameConflictException(String key, String existingUrl) {
        super("Filename conflict: " + key + " already exists");
        this.key = key;
        this.existingUrl = existingUrl;
    }

    public String getKey() { return key; }
    public String getExistingUrl() { return existingUrl; }
}
