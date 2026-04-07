package com.highschoolhowto.note.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateNoteRequest(
        @NotBlank @Size(max = 150) String title,
        String content,
        String color,
        String textColor,
        @Size(max = 32) String fontSize
) {}
