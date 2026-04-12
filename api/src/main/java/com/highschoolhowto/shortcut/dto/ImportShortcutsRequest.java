package com.highschoolhowto.shortcut.dto;

import java.util.List;

public record ImportShortcutsRequest(
        int version,
        List<ImportShortcutItem> shortcuts
) {}
