package com.highschoolhowto.timer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.highschoolhowto.tasks.TaskList;
import com.highschoolhowto.tasks.TaskListRepository;
import com.highschoolhowto.timer.dto.CreateTimerRequest;
import com.highschoolhowto.timer.dto.TimerResponse;
import com.highschoolhowto.timer.dto.UpdateTimerRequest;
import com.highschoolhowto.user.User;
import com.highschoolhowto.user.UserRepository;
import com.highschoolhowto.web.ApiException;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class TimerServiceTest {

    @Mock
    TimerRepository timerRepository;

    @Mock
    UserRepository userRepository;

    @Mock
    TaskListRepository taskListRepository;

    @InjectMocks
    TimerService service;

    private User makeUser(UUID userId) {
        User user = new User();
        try {
            var field = User.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(user, userId);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return user;
    }

    private Timer makeTimer(UUID userId, String title) {
        User user = makeUser(userId);
        Timer timer = new Timer();
        timer.setUser(user);
        timer.setTitle(title);
        return timer;
    }

    // --- createTimer limit enforcement ---

    @Test
    void createTimer_succeedsWhenUnderLimit() {
        UUID userId = UUID.randomUUID();
        User user = makeUser(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(timerRepository.countByUserId(userId)).thenReturn(TimerService.MAX_TIMERS_PER_USER - 1L);

        Timer saved = makeTimer(userId, "Timer");
        when(timerRepository.save(any(Timer.class))).thenReturn(saved);

        TimerResponse response = service.createTimer(userId,
                new CreateTimerRequest("Timer", null, null, null, null, null, null, null, null));

        assertThat(response.title()).isEqualTo("Timer");
        verify(timerRepository).save(any(Timer.class));
    }

    @Test
    void createTimer_failsAtLimit() {
        UUID userId = UUID.randomUUID();
        User user = makeUser(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(timerRepository.countByUserId(userId)).thenReturn((long) TimerService.MAX_TIMERS_PER_USER);

        assertThatThrownBy(() -> service.createTimer(userId,
                new CreateTimerRequest("Timer", null, null, null, null, null, null, null, null)))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY));

        verify(timerRepository, never()).save(any());
    }

    @Test
    void createTimer_usesDefaultDurationsWhenNotProvided() {
        UUID userId = UUID.randomUUID();
        User user = makeUser(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(timerRepository.countByUserId(userId)).thenReturn(0L);

        Timer saved = makeTimer(userId, "Timer");
        when(timerRepository.save(any(Timer.class))).thenReturn(saved);

        service.createTimer(userId,
                new CreateTimerRequest("Timer", null, null, null, null, null, null, null, null));

        verify(timerRepository).save(any(Timer.class));
    }

    @Test
    void createTimer_linksTaskList() {
        UUID userId = UUID.randomUUID();
        UUID listId = UUID.randomUUID();
        User user = makeUser(userId);
        TaskList taskList = new TaskList();
        taskList.setUser(user);
        taskList.setTitle("To-dos");

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(timerRepository.countByUserId(userId)).thenReturn(0L);
        when(taskListRepository.findByIdAndUserId(listId, userId)).thenReturn(Optional.of(taskList));

        Timer saved = makeTimer(userId, "Timer");
        saved.setLinkedTaskList(taskList);
        when(timerRepository.save(any(Timer.class))).thenReturn(saved);

        service.createTimer(userId,
                new CreateTimerRequest("Timer", null, null, null, null, null, null, null, listId));

        verify(taskListRepository).findByIdAndUserId(listId, userId);
    }

    @Test
    void createTimer_throwsWhenLinkedTaskListNotFound() {
        UUID userId = UUID.randomUUID();
        UUID listId = UUID.randomUUID();
        User user = makeUser(userId);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(timerRepository.countByUserId(userId)).thenReturn(0L);
        when(taskListRepository.findByIdAndUserId(listId, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createTimer(userId,
                new CreateTimerRequest("Timer", null, null, null, null, null, null, null, listId)))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    // --- updateTimer ---

    @Test
    void updateTimer_updatesTitle() {
        UUID userId = UUID.randomUUID();
        UUID timerId = UUID.randomUUID();
        Timer timer = makeTimer(userId, "Old Title");

        when(timerRepository.findByIdAndUserId(timerId, userId)).thenReturn(Optional.of(timer));
        when(timerRepository.save(any(Timer.class))).thenAnswer(inv -> inv.getArgument(0));

        TimerResponse response = service.updateTimer(userId, timerId,
                new UpdateTimerRequest("New Title", null, null, null, null, null, null, null, null, false));

        assertThat(response.title()).isEqualTo("New Title");
    }

    @Test
    void updateTimer_clearsLinkedTaskList() {
        UUID userId = UUID.randomUUID();
        UUID timerId = UUID.randomUUID();
        User user = makeUser(userId);
        Timer timer = makeTimer(userId, "Timer");
        TaskList taskList = new TaskList();
        taskList.setUser(user);
        timer.setLinkedTaskList(taskList);

        when(timerRepository.findByIdAndUserId(timerId, userId)).thenReturn(Optional.of(timer));
        when(timerRepository.save(any(Timer.class))).thenAnswer(inv -> inv.getArgument(0));

        TimerResponse response = service.updateTimer(userId, timerId,
                new UpdateTimerRequest("Timer", null, null, null, null, null, null, null, null, true));

        assertThat(response.linkedTaskListId()).isNull();
    }

    @Test
    void updateTimer_throwsWhenNotFound() {
        UUID userId = UUID.randomUUID();
        UUID timerId = UUID.randomUUID();

        when(timerRepository.findByIdAndUserId(timerId, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateTimer(userId, timerId,
                new UpdateTimerRequest("Timer", null, null, null, null, null, null, null, null, false)))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    // --- deleteTimer ---

    @Test
    void deleteTimer_deletesWhenFound() {
        UUID userId = UUID.randomUUID();
        UUID timerId = UUID.randomUUID();
        Timer timer = makeTimer(userId, "Timer");

        when(timerRepository.findByIdAndUserId(timerId, userId)).thenReturn(Optional.of(timer));

        service.deleteTimer(userId, timerId);

        verify(timerRepository).delete(timer);
    }

    @Test
    void deleteTimer_throwsWhenNotFound() {
        UUID userId = UUID.randomUUID();
        UUID timerId = UUID.randomUUID();

        when(timerRepository.findByIdAndUserId(timerId, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.deleteTimer(userId, timerId))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }
}
