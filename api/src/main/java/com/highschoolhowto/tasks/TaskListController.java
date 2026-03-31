package com.highschoolhowto.tasks;

import com.highschoolhowto.security.UserPrincipal;
import com.highschoolhowto.tasks.dto.CreateTaskListRequest;
import com.highschoolhowto.tasks.dto.CreateTaskRequest;
import com.highschoolhowto.tasks.dto.TaskItemResponse;
import com.highschoolhowto.tasks.dto.TaskListResponse;
import com.highschoolhowto.tasks.dto.UpdateTaskRequest;
import com.highschoolhowto.tasks.dto.UpdateTaskListColorRequest;
import com.highschoolhowto.tasks.dto.UpdateTaskListTitleRequest;
import com.highschoolhowto.tasks.dto.ReorderTasksRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tasklists")
public class TaskListController {

    private final TaskListService taskListService;

    public TaskListController(TaskListService taskListService) {
        this.taskListService = taskListService;
    }

    @GetMapping
    public ResponseEntity<List<TaskListResponse>> all(@AuthenticationPrincipal UserPrincipal principal) {
        UUID userId = principal.getUser().getId();
        return ResponseEntity.ok(taskListService.getTaskLists(userId));
    }

    @PostMapping
    public ResponseEntity<TaskListResponse> create(
            @AuthenticationPrincipal UserPrincipal principal, @Valid @RequestBody CreateTaskListRequest request) {
        UUID userId = principal.getUser().getId();
        return ResponseEntity.ok(taskListService.createList(userId, request));
    }

    @DeleteMapping("/{listId}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal UserPrincipal principal, @PathVariable("listId") UUID listId) {
        UUID userId = principal.getUser().getId();
        taskListService.deleteList(userId, listId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{listId}/tasks")
    public ResponseEntity<TaskItemResponse> addTask(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("listId") UUID listId,
            @Valid @RequestBody CreateTaskRequest request) {
        UUID userId = principal.getUser().getId();
        return ResponseEntity.ok(taskListService.addTask(userId, listId, request));
    }

    @PutMapping("/{listId}/title")
    public ResponseEntity<TaskListResponse> updateTitle(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("listId") UUID listId,
            @Valid @RequestBody UpdateTaskListTitleRequest request) {
        UUID userId = principal.getUser().getId();
        return ResponseEntity.ok(taskListService.updateListTitle(userId, listId, request.title()));
    }

    @PutMapping("/{listId}/color")
    public ResponseEntity<TaskListResponse> updateColor(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("listId") UUID listId,
            @Valid @RequestBody UpdateTaskListColorRequest request) {
        UUID userId = principal.getUser().getId();
        return ResponseEntity.ok(taskListService.updateListColor(userId, listId, request.color()));
    }

    @PutMapping("/{listId}/tasks/reorder")
    public ResponseEntity<List<TaskItemResponse>> reorderTasks(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("listId") UUID listId,
            @Valid @RequestBody ReorderTasksRequest request) {
        UUID userId = principal.getUser().getId();
        return ResponseEntity.ok(taskListService.reorderTasks(userId, listId, request.taskIds()));
    }

    @PutMapping("/{listId}/tasks/{taskId}")
    public ResponseEntity<TaskItemResponse> updateTask(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("listId") UUID listId,
            @PathVariable("taskId") UUID taskId,
            @Valid @RequestBody UpdateTaskRequest request) {
        UUID userId = principal.getUser().getId();
        return ResponseEntity.ok(taskListService.updateTask(userId, listId, taskId, request));
    }

    @DeleteMapping("/{listId}/tasks/{taskId}")
    public ResponseEntity<Void> deleteTask(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("listId") UUID listId,
            @PathVariable("taskId") UUID taskId) {
        UUID userId = principal.getUser().getId();
        taskListService.deleteTask(userId, listId, taskId);
        return ResponseEntity.noContent().build();
    }
}
