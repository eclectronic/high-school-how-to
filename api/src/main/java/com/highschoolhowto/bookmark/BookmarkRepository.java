package com.highschoolhowto.bookmark;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookmarkRepository extends JpaRepository<Bookmark, UUID> {
    Optional<Bookmark> findByIdAndBookmarkListId(UUID id, UUID bookmarkListId);
    long countByBookmarkListId(UUID bookmarkListId);
    List<Bookmark> findByBookmarkListIdOrderBySortOrder(UUID bookmarkListId);
}
