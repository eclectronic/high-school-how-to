package com.highschoolhowto.timer.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record UpdateTimerRequest(
        @NotBlank @Size(max = 150) String title,
        String color,
        String textColor,
        @Min(1) @Max(120) Integer focusDuration,
        @Min(1) @Max(60) Integer shortBreakDuration,
        @Min(1) @Max(60) Integer longBreakDuration,
        @Min(1) @Max(10) Integer sessionsBeforeLongBreak,
        String presetName,
        UUID linkedTaskListId,
        boolean clearLinkedTaskList
) {}
