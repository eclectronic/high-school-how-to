package com.highschoolhowto.media;

import java.time.Instant;

public record MediaAssetResponse(
        Long id,
        String url,
        String filename,
        String altText,
        String mimeType,
        Long sizeBytes,
        Integer width,
        Integer height,
        Instant uploadedAt) {

    static MediaAssetResponse from(MediaAsset a) {
        return new MediaAssetResponse(
                a.getId(), a.getUrl(), a.getFilename(), a.getAltText(),
                a.getMimeType(), a.getSizeBytes(), a.getWidth(), a.getHeight(),
                a.getUploadedAt());
    }
}
