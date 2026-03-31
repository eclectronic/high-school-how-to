package com.highschoolhowto.tasks.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateTaskRequest(@NotBlank String description) {}
