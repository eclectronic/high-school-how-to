package com.highschoolhowto.tasks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.highschoolhowto.badge.BadgeService;
import com.highschoolhowto.tasks.dto.CreateTaskListRequest;
import com.highschoolhowto.tasks.dto.CreateTaskRequest;
import com.highschoolhowto.tasks.dto.TaskListResponse;
import com.highschoolhowto.tasks.dto.UpdateTaskRequest;
import com.highschoolhowto.user.User;
import com.highschoolhowto.user.UserRepository;
import com.highschoolhowto.web.ApiException;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class TaskListServiceTest {

    @Mock
    TaskListRepository taskListRepository;

    @Mock
    TaskItemRepository taskItemRepository;

    @Mock
    UserRepository userRepository;

    @Mock
    BadgeService badgeService;

    @InjectMocks
    TaskListService service;

    private User makeUser(UUID userId) {
        User user = new User();
        // Use reflection to set id since it has no setter
        try {
            var field = User.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(user, userId);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return user;
    }

    private TaskList makeList(UUID userId, String title) {
        User user = makeUser(userId);
        TaskList list = new TaskList();
        list.setUser(user);
        list.setTitle(title);
        list.setColor("#fffef8");
        return list;
    }

    // --- createList limit enforcement ---

    @Test
    void createList_succeedsWhenUnderLimit() {
        UUID userId = UUID.randomUUID();
        User user = makeUser(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(taskListRepository.countByUserId(userId)).thenReturn(TaskListService.MAX_LISTS_PER_USER - 1L);

        TaskList savedList = makeList(userId, "To-dos");
        when(taskListRepository.save(any(TaskList.class))).thenReturn(savedList);

        TaskListResponse response = service.createList(userId, new CreateTaskListRequest("To-dos", null, null));

        assertThat(response.title()).isEqualTo("To-dos");
        verify(taskListRepository).save(any(TaskList.class));
    }

    @Test
    void createList_failsAtLimit() {
        UUID userId = UUID.randomUUID();
        User user = makeUser(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(taskListRepository.countByUserId(userId)).thenReturn((long) TaskListService.MAX_LISTS_PER_USER);

        assertThatThrownBy(() -> service.createList(userId, new CreateTaskListRequest("To-dos #21", null, null)))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY));

        verify(taskListRepository, never()).save(any());
    }

    @Test
    void createList_setsTextColorWhenProvided() {
        UUID userId = UUID.randomUUID();
        User user = makeUser(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(taskListRepository.countByUserId(userId)).thenReturn(0L);

        TaskList savedList = makeList(userId, "To-dos");
        savedList.setTextColor("#000000");
        when(taskListRepository.save(any(TaskList.class))).thenReturn(savedList);

        TaskListResponse response = service.createList(userId, new CreateTaskListRequest("To-dos", "#fef3c7", "#000000"));

        assertThat(response.textColor()).isEqualTo("#000000");
    }

    // --- addTask limit enforcement ---

    @Test
    void addTask_succeedsWhenUnderLimit() {
        UUID userId = UUID.randomUUID();
        UUID listId = UUID.randomUUID();
        TaskList list = makeList(userId, "To-dos");
        when(taskListRepository.findByIdAndUserId(listId, userId)).thenReturn(Optional.of(list));
        when(taskItemRepository.countByTaskListId(listId)).thenReturn(TaskListService.MAX_TASKS_PER_LIST - 1L);

        TaskItem savedTask = new TaskItem();
        savedTask.setDescription("Study");
        savedTask.setCompleted(false);
        when(taskItemRepository.save(any(TaskItem.class))).thenReturn(savedTask);

        var response = service.addTask(userId, listId, new CreateTaskRequest("Study", null));

        assertThat(response.description()).isEqualTo("Study");
        assertThat(response.dueAt()).isNull();
    }

    @Test
    void addTask_failsAtLimit() {
        UUID userId = UUID.randomUUID();
        UUID listId = UUID.randomUUID();
        TaskList list = makeList(userId, "To-dos");
        when(taskListRepository.findByIdAndUserId(listId, userId)).thenReturn(Optional.of(list));
        when(taskItemRepository.countByTaskListId(listId)).thenReturn((long) TaskListService.MAX_TASKS_PER_LIST);

        assertThatThrownBy(() -> service.addTask(userId, listId, new CreateTaskRequest("Study", null)))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY));

        verify(taskItemRepository, never()).save(any());
    }

    @Test
    void addTask_storesDueAt() {
        UUID userId = UUID.randomUUID();
        UUID listId = UUID.randomUUID();
        TaskList list = makeList(userId, "To-dos");
        when(taskListRepository.findByIdAndUserId(listId, userId)).thenReturn(Optional.of(list));
        when(taskItemRepository.countByTaskListId(listId)).thenReturn(0L);

        Instant dueAt = Instant.parse("2026-04-10T15:00:00Z");
        TaskItem savedTask = new TaskItem();
        savedTask.setDescription("Study");
        savedTask.setDueAt(dueAt);
        when(taskItemRepository.save(any(TaskItem.class))).thenReturn(savedTask);

        var response = service.addTask(userId, listId, new CreateTaskRequest("Study", dueAt));

        assertThat(response.dueAt()).isEqualTo(dueAt);
    }

    // --- updateTask dueAt handling ---

    @Test
    void updateTask_clearsDueAtWhenFlagSet() {
        UUID userId = UUID.randomUUID();
        UUID listId = UUID.randomUUID();
        UUID taskId = UUID.randomUUID();

        TaskItem task = new TaskItem();
        task.setDescription("Study");
        task.setDueAt(Instant.now());
        when(taskItemRepository.findByIdAndTaskListIdAndTaskListUserId(taskId, listId, userId))
                .thenReturn(Optional.of(task));
        when(taskItemRepository.save(any(TaskItem.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = service.updateTask(userId, listId, taskId, new UpdateTaskRequest(null, null, null, true));

        assertThat(response.dueAt()).isNull();
    }

    @Test
    void updateTask_setsDueAtWhenProvided() {
        UUID userId = UUID.randomUUID();
        UUID listId = UUID.randomUUID();
        UUID taskId = UUID.randomUUID();

        TaskItem task = new TaskItem();
        task.setDescription("Study");
        when(taskItemRepository.findByIdAndTaskListIdAndTaskListUserId(taskId, listId, userId))
                .thenReturn(Optional.of(task));
        when(taskItemRepository.save(any(TaskItem.class))).thenAnswer(inv -> inv.getArgument(0));

        Instant dueAt = Instant.parse("2026-04-10T15:00:00Z");
        var response = service.updateTask(userId, listId, taskId, new UpdateTaskRequest(null, null, dueAt, false));

        assertThat(response.dueAt()).isEqualTo(dueAt);
    }
}
