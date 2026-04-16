package com.highschoolhowto.note.dto;

import com.highschoolhowto.note.NoteType;
import java.time.Instant;
import java.util.UUID;

public record NoteResponse(
        UUID id,
        String title,
        String content,
        String color,
        String textColor,
        String fontSize,
        NoteType noteType,
        int sortOrder,
        Instant createdAt,
        Instant updatedAt
) {}
