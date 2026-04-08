package com.highschoolhowto.shortcut;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ShortcutRepository extends JpaRepository<Shortcut, UUID> {

    List<Shortcut> findByUserIdOrderByCreatedAtAsc(UUID userId);

    long countByUserId(UUID userId);

    Optional<Shortcut> findByIdAndUserId(UUID id, UUID userId);

    @Query("SELECT s.url FROM Shortcut s WHERE s.user.id = :userId")
    List<String> findUrlsByUserId(@Param("userId") UUID userId);
}
