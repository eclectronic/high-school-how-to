package com.highschoolhowto.note.dto;

import com.highschoolhowto.badge.dto.EarnedBadgeResponse;
import com.highschoolhowto.note.NoteType;
import java.time.Instant;
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
        NoteType noteType,
        int sortOrder,
        Instant createdAt,
        Instant updatedAt,
        EarnedBadgeResponse earnedBadge) {}
