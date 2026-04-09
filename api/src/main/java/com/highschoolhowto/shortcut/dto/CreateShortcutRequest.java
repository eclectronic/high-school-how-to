package com.highschoolhowto.shortcut.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateShortcutRequest(
        @NotBlank @Size(max = 2048) String url,
        @Size(max = 255) String name,
        @Size(max = 512) String faviconUrl,
        @Size(max = 10) String emoji,
        @Size(max = 2000) String iconUrl
) {}
