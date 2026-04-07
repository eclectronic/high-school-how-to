package com.highschoolhowto.tasks;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TaskItemRepository extends JpaRepository<TaskItem, UUID> {
    Optional<TaskItem> findByIdAndTaskListIdAndTaskListUserId(UUID id, UUID taskListId, UUID userId);

    List<TaskItem> findByTaskListIdAndTaskListUserId(UUID taskListId, UUID userId);

    long countByTaskListId(UUID taskListId);
}
