package com.highschoolhowto.shortcut.dto;

import java.util.UUID;

public record RecommendedShortcutResponse(
        UUID id,
        String name,
        String url,
        String emoji,
        String faviconUrl,
        String category,
        int sortOrder,
        boolean active
) {}
