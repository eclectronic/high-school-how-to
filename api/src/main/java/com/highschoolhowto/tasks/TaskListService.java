package com.highschoolhowto.tasks;

import com.highschoolhowto.tasks.dto.CreateTaskListRequest;
import com.highschoolhowto.tasks.dto.CreateTaskRequest;
import com.highschoolhowto.tasks.dto.TaskItemResponse;
import com.highschoolhowto.tasks.dto.TaskListResponse;
import com.highschoolhowto.tasks.dto.UpdateTaskRequest;
import com.highschoolhowto.user.User;
import com.highschoolhowto.user.UserRepository;
import com.highschoolhowto.web.ApiException;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class TaskListService {

    private final TaskListRepository taskListRepository;
    private final TaskItemRepository taskItemRepository;
    private final UserRepository userRepository;

    public TaskListService(
            TaskListRepository taskListRepository, TaskItemRepository taskItemRepository, UserRepository userRepository) {
        this.taskListRepository = taskListRepository;
        this.taskItemRepository = taskItemRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<TaskListResponse> getTaskLists(UUID userId) {
        return taskListRepository.findByUserIdOrderByCreatedAt(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    public static final int MAX_LISTS_PER_USER = 20;
    static final int MAX_TASKS_PER_LIST = 50;

    @Transactional
    public TaskListResponse createList(UUID userId, CreateTaskListRequest request) {
        User user = userRepository
                .findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found", "User not found"));
        long count = taskListRepository.countByUserId(userId);
        if (count >= MAX_LISTS_PER_USER) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Limit reached",
                    "Maximum of " + MAX_LISTS_PER_USER + " lists per user reached");
        }
        TaskList list = new TaskList();
        list.setUser(user);
        list.setTitle(request.title().trim());
        if (StringUtils.hasText(request.color())) {
            list.setColor(request.color().trim());
        }
        if (StringUtils.hasText(request.textColor())) {
            list.setTextColor(request.textColor().trim());
        }
        TaskList saved = taskListRepository.save(list);
        return toResponse(saved);
    }

    @Transactional
    public void deleteList(UUID userId, UUID listId) {
        TaskList list = requireList(listId, userId);
        taskListRepository.delete(list);
    }

    @Transactional
    public TaskListResponse updateListTitle(UUID userId, UUID listId, String title) {
        TaskList list = requireList(listId, userId);
        list.setTitle(title.trim());
        TaskList saved = taskListRepository.save(list);
        return toResponse(saved);
    }

    @Transactional
    public TaskListResponse updateListColor(UUID userId, UUID listId, String color, String textColor) {
        TaskList list = requireList(listId, userId);
        list.setColor(color);
        list.setTextColor(textColor); // null clears it (reverts to auto-contrast)
        TaskList saved = taskListRepository.save(list);
        return toResponse(saved);
    }

    @Transactional
    public TaskItemResponse addTask(UUID userId, UUID listId, CreateTaskRequest request) {
        TaskList list = requireList(listId, userId);
        long taskCount = taskItemRepository.countByTaskListId(listId);
        if (taskCount >= MAX_TASKS_PER_LIST) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Limit reached",
                    "Maximum of " + MAX_TASKS_PER_LIST + " tasks per list reached");
        }
        TaskItem task = new TaskItem();
        task.setTaskList(list);
        task.setSortOrder(nextSortOrder(list));
        task.setDescription(request.description().trim());
        task.setCompleted(false);
        task.setDueAt(request.dueAt());
        TaskItem saved = taskItemRepository.save(task);
        return toResponse(saved);
    }

    @Transactional
    public TaskItemResponse updateTask(UUID userId, UUID listId, UUID taskId, UpdateTaskRequest request) {
        TaskItem task = taskItemRepository
                .findByIdAndTaskListIdAndTaskListUserId(taskId, listId, userId)
                .orElseThrow(() ->
                        new ApiException(HttpStatus.NOT_FOUND, "Task not found", "Task not found for this user"));
        if (request.description() != null && StringUtils.hasText(request.description())) {
            task.setDescription(request.description().trim());
        }
        if (request.completed() != null) {
            task.setCompleted(request.completed());
        }
        if (request.clearDueAt()) {
            task.setDueAt(null);
        } else if (request.dueAt() != null) {
            task.setDueAt(request.dueAt());
        }
        TaskItem saved = taskItemRepository.save(task);
        return toResponse(saved);
    }

    @Transactional
    public void deleteTask(UUID userId, UUID listId, UUID taskId) {
        TaskItem task = taskItemRepository
                .findByIdAndTaskListIdAndTaskListUserId(taskId, listId, userId)
                .orElseThrow(() ->
                        new ApiException(HttpStatus.NOT_FOUND, "Task not found", "Task not found for this user"));
        taskItemRepository.delete(task);
    }

    @Transactional
    public List<TaskItemResponse> reorderTasks(UUID userId, UUID listId, List<UUID> orderedIds) {
        TaskList list = requireList(listId, userId);
        List<TaskItem> tasks = taskItemRepository.findByTaskListIdAndTaskListUserId(listId, userId);
        if (tasks.size() != orderedIds.size()) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST, "Invalid order", "Order does not match task count for this list");
        }
        var taskById = tasks.stream().collect(java.util.stream.Collectors.toMap(TaskItem::getId, t -> t));
        int index = 0;
        for (UUID id : orderedIds) {
            TaskItem task = taskById.get(id);
            if (task == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid order", "Unknown task id in order");
            }
            task.setSortOrder(index++);
        }
        List<TaskItem> saved = taskItemRepository.saveAll(taskById.values());
        // reload tasks from list for deterministic ordering
        list.getTasks().clear();
        list.getTasks().addAll(saved);
        return saved.stream()
                .sorted(Comparator.comparingInt(TaskItem::getSortOrder))
                .map(this::toResponse)
                .toList();
    }

    private TaskList requireList(UUID listId, UUID userId) {
        return taskListRepository
                .findByIdAndUserId(listId, userId)
                .orElseThrow(() ->
                        new ApiException(HttpStatus.NOT_FOUND, "Task list not found", "Task list not found for this user"));
    }

    private TaskListResponse toResponse(TaskList list) {
        var tasks = list.getTasks().stream()
                .sorted(Comparator.comparingInt(TaskItem::getSortOrder).thenComparing(TaskItem::getCreatedAt))
                .map(this::toResponse)
                .toList();
        return new TaskListResponse(list.getId(), list.getTitle(), list.getColor(), list.getTextColor(), tasks);
    }

    private TaskItemResponse toResponse(TaskItem task) {
        return new TaskItemResponse(task.getId(), task.getDescription(), task.isCompleted(), task.getDueAt());
    }

    private int nextSortOrder(TaskList list) {
        return list.getTasks().stream().mapToInt(TaskItem::getSortOrder).max().orElse(-1) + 1;
    }
}
