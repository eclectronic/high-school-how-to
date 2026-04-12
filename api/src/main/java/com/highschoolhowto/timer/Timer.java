package com.highschoolhowto.timer;

import com.highschoolhowto.tasks.TaskList;
import com.highschoolhowto.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "timers")
public class Timer {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(nullable = false, length = 255)
    private String color = "#fffef8";

    @Column(name = "text_color", length = 255)
    private String textColor;

    @Enumerated(EnumType.STRING)
    @Column(name = "timer_type", nullable = false, length = 16)
    private TimerType timerType = TimerType.POMODORO;

    /** Configured duration (in seconds) for a BASIC timer. Ignored for POMODORO. */
    @Column(name = "basic_duration_seconds", nullable = false)
    private int basicDurationSeconds = 300;

    @Column(name = "focus_duration", nullable = false)
    private int focusDuration = 25;

    @Column(name = "short_break_duration", nullable = false)
    private int shortBreakDuration = 5;

    @Column(name = "long_break_duration", nullable = false)
    private int longBreakDuration = 15;

    @Column(name = "sessions_before_long_break", nullable = false)
    private int sessionsBeforeLongBreak = 4;

    @Column(name = "preset_name", length = 64)
    private String presetName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "linked_task_list_id")
    private TaskList linkedTaskList;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() { return id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public String getTextColor() { return textColor; }
    public void setTextColor(String textColor) { this.textColor = textColor; }

    public TimerType getTimerType() { return timerType; }
    public void setTimerType(TimerType timerType) { this.timerType = timerType; }

    public int getBasicDurationSeconds() { return basicDurationSeconds; }
    public void setBasicDurationSeconds(int basicDurationSeconds) { this.basicDurationSeconds = basicDurationSeconds; }

    public int getFocusDuration() { return focusDuration; }
    public void setFocusDuration(int focusDuration) { this.focusDuration = focusDuration; }

    public int getShortBreakDuration() { return shortBreakDuration; }
    public void setShortBreakDuration(int shortBreakDuration) { this.shortBreakDuration = shortBreakDuration; }

    public int getLongBreakDuration() { return longBreakDuration; }
    public void setLongBreakDuration(int longBreakDuration) { this.longBreakDuration = longBreakDuration; }

    public int getSessionsBeforeLongBreak() { return sessionsBeforeLongBreak; }
    public void setSessionsBeforeLongBreak(int sessionsBeforeLongBreak) { this.sessionsBeforeLongBreak = sessionsBeforeLongBreak; }

    public String getPresetName() { return presetName; }
    public void setPresetName(String presetName) { this.presetName = presetName; }

    public TaskList getLinkedTaskList() { return linkedTaskList; }
    public void setLinkedTaskList(TaskList linkedTaskList) { this.linkedTaskList = linkedTaskList; }

    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
