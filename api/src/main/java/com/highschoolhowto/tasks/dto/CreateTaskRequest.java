package com.highschoolhowto.tasks.dto;

import jakarta.validation.constraints.NotBlank;
import java.time.Instant;

public record CreateTaskRequest(@NotBlank String description, Instant dueAt) {}
