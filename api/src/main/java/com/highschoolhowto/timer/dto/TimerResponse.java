package com.highschoolhowto.timer.dto;

import java.util.UUID;

public record TimerResponse(
        UUID id,
        String title,
        String color,
        String textColor,
        int focusDuration,
        int shortBreakDuration,
        int longBreakDuration,
        int sessionsBeforeLongBreak,
        String presetName,
        UUID linkedTaskListId
) {}
