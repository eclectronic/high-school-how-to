package com.highschoolhowto.badge;

import com.highschoolhowto.user.User;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EarnedBadgeRepository extends JpaRepository<EarnedBadge, Long> {

    List<EarnedBadge> findByUserIdOrderByEarnedAtAsc(UUID userId);

    boolean existsByUserIdAndBadgeId(UUID userId, Long badgeId);
}
