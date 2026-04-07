package com.highschoolhowto.bookmark;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookmarkListRepository extends JpaRepository<BookmarkList, UUID> {
    List<BookmarkList> findByUserIdOrderByCreatedAt(UUID userId);
    long countByUserId(UUID userId);
    Optional<BookmarkList> findByIdAndUserId(UUID id, UUID userId);
}
