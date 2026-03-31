package com.highschoolhowto.tasks.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateTaskListTitleRequest(@NotBlank @Size(max = 255) String title) {}