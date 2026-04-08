package com.highschoolhowto.shortcut.dto;

public record ImportShortcutsResponse(
        int imported,
        int skipped,
        String reason
) {}
