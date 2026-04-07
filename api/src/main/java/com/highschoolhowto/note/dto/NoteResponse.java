package com.highschoolhowto.note.dto;

import java.util.UUID;

public record NoteResponse(
        UUID id,
        String title,
        String content,
        String color,
        String textColor,
        String fontSize
) {}
