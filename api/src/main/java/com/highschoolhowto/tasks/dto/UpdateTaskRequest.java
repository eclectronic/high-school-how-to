package com.highschoolhowto.tasks.dto;

import jakarta.validation.constraints.Size;

public record UpdateTaskRequest(@Size(max = 500) String description, Boolean completed) {}
