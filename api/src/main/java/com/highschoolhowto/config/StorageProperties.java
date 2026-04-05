package com.highschoolhowto.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "storage.s3")
public class StorageProperties {

    private String bucket;
    private String region = "us-west-2";
    private String uploadPrefix = "uploads/";
    private String cdnBaseUrl;

    public String getBucket() {
        return bucket;
    }

    public void setBucket(String bucket) {
        this.bucket = bucket;
    }

    public String getRegion() {
        return region;
    }

    public void setRegion(String region) {
        this.region = region;
    }

    public String getUploadPrefix() {
        return uploadPrefix;
    }

    public void setUploadPrefix(String uploadPrefix) {
        this.uploadPrefix = uploadPrefix;
    }

    public String getCdnBaseUrl() {
        return cdnBaseUrl;
    }

    public void setCdnBaseUrl(String cdnBaseUrl) {
        this.cdnBaseUrl = cdnBaseUrl;
    }
}
