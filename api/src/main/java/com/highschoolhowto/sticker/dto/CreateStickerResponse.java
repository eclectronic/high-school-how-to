package com.highschoolhowto.sticker.dto;

import com.highschoolhowto.badge.dto.EarnedBadgeResponse;
import java.util.UUID;

/**
 * Response for sticker creation. Includes the created sticker fields and an
 * optional earnedBadge if this creation triggered a badge award.
 */
public record CreateStickerResponse(
        UUID id,
        String type,
        String emoji,
        String imageUrl,
        double positionX,
        double positionY,
        String size,
        EarnedBadgeResponse earnedBadge) {}
