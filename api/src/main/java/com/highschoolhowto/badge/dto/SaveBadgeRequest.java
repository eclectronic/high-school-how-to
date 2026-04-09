package com.highschoolhowto.badge.dto;

import com.highschoolhowto.badge.BadgeTriggerType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SaveBadgeRequest(
        @NotBlank @Size(max = 255) String name,
        @Size(max = 2000) String description,
        @Size(max = 10) String emoji,
        @Size(max = 2000) String iconUrl,
        @NotNull BadgeTriggerType triggerType,
        @Size(max = 255) String triggerParam) {}
