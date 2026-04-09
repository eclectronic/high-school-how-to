package com.highschoolhowto.timer.dto;

import com.highschoolhowto.badge.dto.EarnedBadgeResponse;
import java.util.UUID;

/**
 * Response for timer update operations. Includes the updated timer fields and
 * an optional earnedBadge if this update triggered a badge award.
 */
public record UpdateTimerResponse(
        UUID id,
        String title,
        String color,
        String textColor,
        int focusDuration,
        int shortBreakDuration,
        int longBreakDuration,
        int sessionsBeforeLongBreak,
        String presetName,
        UUID linkedTaskListId,
        EarnedBadgeResponse earnedBadge) {}
