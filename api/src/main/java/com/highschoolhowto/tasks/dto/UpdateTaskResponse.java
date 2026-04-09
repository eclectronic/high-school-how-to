package com.highschoolhowto.tasks.dto;

import com.highschoolhowto.badge.dto.EarnedBadgeResponse;
import java.time.Instant;
import java.util.UUID;

/**
 * Response for task update operations. Includes the updated task fields and
 * an optional earnedBadge if this update triggered a badge award.
 */
public record UpdateTaskResponse(
        UUID id,
        String description,
        boolean completed,
        Instant dueAt,
        EarnedBadgeResponse earnedBadge) {}
