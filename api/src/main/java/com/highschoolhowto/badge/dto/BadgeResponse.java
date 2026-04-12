package com.highschoolhowto.badge.dto;

import com.highschoolhowto.badge.Badge;
import com.highschoolhowto.badge.BadgeTriggerType;

public record BadgeResponse(
        Long id,
        String name,
        String description,
        String emoji,
        String iconUrl,
        BadgeTriggerType triggerType,
        String triggerParam) {

    public static BadgeResponse from(Badge badge) {
        return new BadgeResponse(
                badge.getId(),
                badge.getName(),
                badge.getDescription(),
                badge.getEmoji(),
                badge.getIconUrl(),
                badge.getTriggerType(),
                badge.getTriggerParam());
    }
}
