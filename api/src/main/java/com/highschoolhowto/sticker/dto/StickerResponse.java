package com.highschoolhowto.sticker.dto;

import java.util.UUID;

public record StickerResponse(
        UUID id,
        String type,
        String emoji,
        String imageUrl,
        double positionX,
        double positionY,
        String size
) {}
