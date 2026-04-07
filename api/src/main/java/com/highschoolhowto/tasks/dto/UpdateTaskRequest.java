package com.highschoolhowto.tasks.dto;

import jakarta.validation.constraints.Size;
import java.time.Instant;

public record UpdateTaskRequest(@Size(max = 500) String description, Boolean completed, Instant dueAt, boolean clearDueAt) {}
