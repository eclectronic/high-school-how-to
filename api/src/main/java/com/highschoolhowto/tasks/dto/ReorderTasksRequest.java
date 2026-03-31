package com.highschoolhowto.tasks.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import java.util.UUID;

public record ReorderTasksRequest(@NotEmpty List<UUID> taskIds) {}
