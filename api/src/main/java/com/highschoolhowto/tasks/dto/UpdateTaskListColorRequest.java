package com.highschoolhowto.tasks.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateTaskListColorRequest(@NotBlank String color) {}
