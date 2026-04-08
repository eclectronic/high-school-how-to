package com.highschoolhowto.badge;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BadgeRepository extends JpaRepository<Badge, Long> {

    Optional<Badge> findByTriggerTypeAndTriggerParam(BadgeTriggerType triggerType, String triggerParam);
}
