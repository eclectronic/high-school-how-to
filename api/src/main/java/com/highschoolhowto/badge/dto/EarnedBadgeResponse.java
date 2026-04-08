package com.highschoolhowto.badge.dto;

import com.highschoolhowto.badge.EarnedBadge;
import java.time.Instant;

public record EarnedBadgeResponse(
        Long id,
        BadgeResponse badge,
        Instant earnedAt) {

    public static EarnedBadgeResponse from(EarnedBadge earned) {
        return new EarnedBadgeResponse(
                earned.getId(),
                BadgeResponse.from(earned.getBadge()),
                earned.getEarnedAt());
    }
}
