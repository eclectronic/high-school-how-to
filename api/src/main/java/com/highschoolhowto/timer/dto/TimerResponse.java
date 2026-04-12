package com.highschoolhowto.timer.dto;

import com.highschoolhowto.timer.TimerType;
import java.util.UUID;

public record TimerResponse(
        UUID id,
        String title,
        String color,
        String textColor,
        TimerType timerType,
        int basicDurationSeconds,
        int focusDuration,
        int shortBreakDuration,
        int longBreakDuration,
        int sessionsBeforeLongBreak,
        String presetName,
        UUID linkedTaskListId
) {}
