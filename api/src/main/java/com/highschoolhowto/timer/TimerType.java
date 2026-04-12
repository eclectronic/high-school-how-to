package com.highschoolhowto.timer;

/**
 * Discriminates between the classic Pomodoro timer (with focus/break cycles)
 * and a plain countdown ("basic") timer that rings once when its duration
 * elapses.
 */
public enum TimerType {
    POMODORO,
    BASIC
}
