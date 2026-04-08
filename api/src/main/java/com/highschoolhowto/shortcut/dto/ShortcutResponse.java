package com.highschoolhowto.shortcut.dto;

import java.util.UUID;

public record ShortcutResponse(
        UUID id,
        String url,
        String name,
        String faviconUrl,
        String emoji,
        String iconUrl
) {}
