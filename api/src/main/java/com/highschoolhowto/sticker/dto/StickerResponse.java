package com.highschoolhowto.sticker.dto;

import java.time.Instant;
import java.util.UUID;

public record StickerResponse(
        UUID id,
        String emoji,
        String iconUrl,
        String label,
        Instant createdAt,
        Instant updatedAt
) {}
