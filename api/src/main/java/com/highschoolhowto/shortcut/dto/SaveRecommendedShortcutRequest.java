package com.highschoolhowto.shortcut.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SaveRecommendedShortcutRequest(
        @NotBlank @Size(max = 255) String name,
        @NotBlank @Size(max = 2048) String url,
        @Size(max = 10) String emoji,
        @Size(max = 512) String faviconUrl,
        @Size(max = 100) String category,
        int sortOrder,
        boolean active
) {}
