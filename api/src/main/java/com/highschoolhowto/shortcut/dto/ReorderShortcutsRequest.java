package com.highschoolhowto.shortcut.dto;

import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

public record ReorderShortcutsRequest(@NotNull List<UUID> ids) {}
