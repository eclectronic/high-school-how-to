package com.highschoolhowto.tasks;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskListRepository extends JpaRepository<TaskList, UUID> {
    @EntityGraph(attributePaths = "tasks")
    List<TaskList> findByUserIdOrderByCreatedAt(UUID userId);

    @EntityGraph(attributePaths = "tasks")
    Optional<TaskList> findByIdAndUserId(UUID id, UUID userId);

    long countByUserId(UUID userId);

    Optional<TaskList> findFirstByUserIdAndSourceContentCardIdOrderByCreatedAtAsc(
            UUID userId, Long sourceContentCardId);
}
