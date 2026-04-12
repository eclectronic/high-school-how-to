package com.highschoolhowto.timer;

import com.highschoolhowto.badge.BadgeService;
import com.highschoolhowto.badge.BadgeTriggerType;
import com.highschoolhowto.badge.dto.EarnedBadgeResponse;
import com.highschoolhowto.tasks.TaskList;
import com.highschoolhowto.tasks.TaskListRepository;
import com.highschoolhowto.timer.dto.CreateTimerRequest;
import com.highschoolhowto.timer.dto.TimerResponse;
import com.highschoolhowto.timer.dto.UpdateTimerRequest;
import com.highschoolhowto.timer.dto.UpdateTimerResponse;
import com.highschoolhowto.user.User;
import com.highschoolhowto.user.UserRepository;
import com.highschoolhowto.web.ApiException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class TimerService {

    static final int MAX_TIMERS_PER_USER = 10;

    private final TimerRepository timerRepository;
    private final UserRepository userRepository;
    private final TaskListRepository taskListRepository;
    private final BadgeService badgeService;

    public TimerService(
            TimerRepository timerRepository,
            UserRepository userRepository,
            TaskListRepository taskListRepository,
            BadgeService badgeService) {
        this.timerRepository = timerRepository;
        this.userRepository = userRepository;
        this.taskListRepository = taskListRepository;
        this.badgeService = badgeService;
    }

    @Transactional(readOnly = true)
    public List<TimerResponse> getTimers(UUID userId) {
        return timerRepository.findByUserIdOrderByCreatedAt(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public TimerResponse createTimer(UUID userId, CreateTimerRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found", "User not found"));
        long count = timerRepository.countByUserId(userId);
        if (count >= MAX_TIMERS_PER_USER) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Limit reached",
                    "Maximum of " + MAX_TIMERS_PER_USER + " timers per user reached");
        }
        Timer timer = new Timer();
        timer.setUser(user);
        timer.setTitle(request.title().trim());
        if (StringUtils.hasText(request.color())) {
            timer.setColor(request.color().trim());
        }
        if (StringUtils.hasText(request.textColor())) {
            timer.setTextColor(request.textColor().trim());
        }
        if (request.timerType() != null) {
            timer.setTimerType(request.timerType());
        }
        if (request.basicDurationSeconds() != null) {
            timer.setBasicDurationSeconds(request.basicDurationSeconds());
        }
        if (request.focusDuration() != null) {
            timer.setFocusDuration(request.focusDuration());
        }
        if (request.shortBreakDuration() != null) {
            timer.setShortBreakDuration(request.shortBreakDuration());
        }
        if (request.longBreakDuration() != null) {
            timer.setLongBreakDuration(request.longBreakDuration());
        }
        if (request.sessionsBeforeLongBreak() != null) {
            timer.setSessionsBeforeLongBreak(request.sessionsBeforeLongBreak());
        }
        timer.setPresetName(request.presetName());
        if (request.linkedTaskListId() != null) {
            TaskList taskList = requireTaskList(request.linkedTaskListId(), userId);
            timer.setLinkedTaskList(taskList);
        }
        return toResponse(timerRepository.save(timer));
    }

    @Transactional
    public UpdateTimerResponse updateTimer(UUID userId, UUID timerId, UpdateTimerRequest request) {
        Timer timer = requireTimer(timerId, userId);
        timer.setTitle(request.title().trim());
        timer.setColor(StringUtils.hasText(request.color()) ? request.color().trim() : timer.getColor());
        timer.setTextColor(StringUtils.hasText(request.textColor()) ? request.textColor().trim() : null);
        if (request.timerType() != null) {
            timer.setTimerType(request.timerType());
        }
        if (request.basicDurationSeconds() != null) {
            timer.setBasicDurationSeconds(request.basicDurationSeconds());
        }
        if (request.focusDuration() != null) {
            timer.setFocusDuration(request.focusDuration());
        }
        if (request.shortBreakDuration() != null) {
            timer.setShortBreakDuration(request.shortBreakDuration());
        }
        if (request.longBreakDuration() != null) {
            timer.setLongBreakDuration(request.longBreakDuration());
        }
        if (request.sessionsBeforeLongBreak() != null) {
            timer.setSessionsBeforeLongBreak(request.sessionsBeforeLongBreak());
        }
        timer.setPresetName(request.presetName());
        if (request.clearLinkedTaskList()) {
            timer.setLinkedTaskList(null);
        } else if (request.linkedTaskListId() != null) {
            TaskList taskList = requireTaskList(request.linkedTaskListId(), userId);
            timer.setLinkedTaskList(taskList);
        }
        timerRepository.save(timer);

        // Check for badge awards when a focus or study session completes.
        Optional<EarnedBadgeResponse> earnedBadge = Optional.empty();
        if (request.focusSessionCompleted() || request.studySessionCompleted()) {
            User user = userRepository
                    .findById(userId)
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found", "User not found"));
            if (request.studySessionCompleted()) {
                earnedBadge = badgeService.checkFeatureBadge(user, BadgeTriggerType.FIRST_STUDY_SESSION);
            }
            if (earnedBadge.isEmpty() && request.focusSessionCompleted()) {
                earnedBadge = badgeService.checkFeatureBadge(user, BadgeTriggerType.FIRST_TIMER);
            }
        }

        return toUpdateResponse(timer, earnedBadge.orElse(null));
    }

    @Transactional
    public void deleteTimer(UUID userId, UUID timerId) {
        Timer timer = requireTimer(timerId, userId);
        timerRepository.delete(timer);
    }

    private Timer requireTimer(UUID timerId, UUID userId) {
        return timerRepository.findByIdAndUserId(timerId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Timer not found", "Timer not found for this user"));
    }

    private TaskList requireTaskList(UUID taskListId, UUID userId) {
        return taskListRepository.findByIdAndUserId(taskListId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Task list not found", "Task list not found for this user"));
    }

    private TimerResponse toResponse(Timer timer) {
        UUID linkedListId = timer.getLinkedTaskList() != null ? timer.getLinkedTaskList().getId() : null;
        return new TimerResponse(
                timer.getId(),
                timer.getTitle(),
                timer.getColor(),
                timer.getTextColor(),
                timer.getTimerType(),
                timer.getBasicDurationSeconds(),
                timer.getFocusDuration(),
                timer.getShortBreakDuration(),
                timer.getLongBreakDuration(),
                timer.getSessionsBeforeLongBreak(),
                timer.getPresetName(),
                linkedListId
        );
    }

    private UpdateTimerResponse toUpdateResponse(Timer timer, EarnedBadgeResponse earnedBadge) {
        UUID linkedListId = timer.getLinkedTaskList() != null ? timer.getLinkedTaskList().getId() : null;
        return new UpdateTimerResponse(
                timer.getId(),
                timer.getTitle(),
                timer.getColor(),
                timer.getTextColor(),
                timer.getTimerType(),
                timer.getBasicDurationSeconds(),
                timer.getFocusDuration(),
                timer.getShortBreakDuration(),
                timer.getLongBreakDuration(),
                timer.getSessionsBeforeLongBreak(),
                timer.getPresetName(),
                linkedListId,
                earnedBadge
        );
    }
}
