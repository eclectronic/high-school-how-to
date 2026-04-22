package com.highschoolhowto.shortcut;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RecommendedShortcutRepository extends JpaRepository<RecommendedShortcut, UUID> {

    List<RecommendedShortcut> findByActiveTrueOrderByCategoryAscSortOrderAsc();
}
