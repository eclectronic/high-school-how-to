package com.highschoolhowto.note.dto;

import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

public record ReorderNotesRequest(@NotNull List<UUID> ids) {}
