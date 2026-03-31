package com.highschoolhowto.tasks.dto;

import java.util.List;
import java.util.UUID;

public record TaskListResponse(UUID id, String title, String color, List<TaskItemResponse> tasks) {}
