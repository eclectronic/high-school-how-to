package com.highschoolhowto.storage;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import net.coobird.thumbnailator.Thumbnails;
import org.springframework.stereotype.Service;

@Service
public class ThumbnailService {

    private static final int THUMBNAIL_WIDTH = 400;

    /**
     * Generates a JPEG thumbnail at {@value #THUMBNAIL_WIDTH}px wide (maintaining aspect ratio)
     * from the provided image bytes.
     *
     * @param originalBytes raw image bytes (JPEG, PNG, or WebP)
     * @return JPEG-encoded thumbnail bytes
     */
    public byte[] generateThumbnail(byte[] originalBytes) {
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            Thumbnails.of(new ByteArrayInputStream(originalBytes))
                    .width(THUMBNAIL_WIDTH)
                    .outputFormat("jpeg")
                    .outputQuality(0.85)
                    .toOutputStream(out);
            return out.toByteArray();
        } catch (IOException ex) {
            throw new StorageException("Failed to generate thumbnail", ex);
        }
    }
}
