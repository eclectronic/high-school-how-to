package com.highschoolhowto.timer.dto;

import com.highschoolhowto.timer.TimerType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record CreateTimerRequest(
        @NotBlank @Size(max = 150) String title,
        String color,
        String textColor,
        TimerType timerType,
        @Min(1) @Max(86400) Integer basicDurationSeconds,
        @Min(1) @Max(120) Integer focusDuration,
        @Min(1) @Max(60) Integer shortBreakDuration,
        @Min(1) @Max(60) Integer longBreakDuration,
        @Min(1) @Max(10) Integer sessionsBeforeLongBreak,
        String presetName,
        UUID linkedTaskListId
) {}
