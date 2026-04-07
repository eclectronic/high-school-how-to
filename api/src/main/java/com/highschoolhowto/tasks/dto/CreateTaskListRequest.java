package com.highschoolhowto.tasks.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateTaskListRequest(
        @NotBlank @Size(max = 150) String title,
        @Size(max = 255) String color,
        @Size(max = 255) String textColor) {}
