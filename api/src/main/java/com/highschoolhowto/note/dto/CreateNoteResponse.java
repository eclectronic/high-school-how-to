package com.highschoolhowto.note.dto;

import com.highschoolhowto.badge.dto.EarnedBadgeResponse;
import java.util.UUID;

/**
 * Response for note creation. Includes the created note fields and an optional
 * earnedBadge if this creation triggered a badge award.
 */
public record CreateNoteResponse(
        UUID id,
        String title,
        String content,
        String color,
        String textColor,
        String fontSize,
        EarnedBadgeResponse earnedBadge) {}
