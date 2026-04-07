package com.highschoolhowto.timer;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TimerRepository extends JpaRepository<Timer, UUID> {

    List<Timer> findByUserIdOrderByCreatedAt(UUID userId);

    long countByUserId(UUID userId);

    Optional<Timer> findByIdAndUserId(UUID id, UUID userId);
}
