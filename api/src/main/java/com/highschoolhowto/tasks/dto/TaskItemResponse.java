package com.highschoolhowto.tasks.dto;

import java.time.Instant;
import java.util.UUID;

public record TaskItemResponse(UUID id, String description, boolean completed, Instant dueAt) {}
