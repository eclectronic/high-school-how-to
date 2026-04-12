package com.highschoolhowto.content.card;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ContentCardRepository extends JpaRepository<ContentCard, Long> {

    @Query("SELECT DISTINCT c FROM ContentCard c LEFT JOIN FETCH c.tags ORDER BY c.updatedAt DESC")
    List<ContentCard> findAllWithTags();

    @Query("SELECT DISTINCT c FROM ContentCard c LEFT JOIN FETCH c.tags LEFT JOIN FETCH c.templateTasks WHERE c.id = :id")
    Optional<ContentCard> findByIdWithTags(@Param("id") Long id);

    @Query("SELECT DISTINCT c FROM ContentCard c LEFT JOIN FETCH c.tags LEFT JOIN FETCH c.templateTasks WHERE c.slug = :slug")
    Optional<ContentCard> findBySlug(@Param("slug") String slug);

    boolean existsBySlug(String slug);

    @Query("SELECT DISTINCT c FROM ContentCard c LEFT JOIN FETCH c.tags WHERE c.status = :status ORDER BY c.updatedAt DESC")
    List<ContentCard> findByStatus(@Param("status") CardStatus status);

    @Query("SELECT DISTINCT c FROM ContentCard c LEFT JOIN FETCH c.tags WHERE c.status = :status AND EXISTS (SELECT t FROM c.tags t WHERE t.slug = :tagSlug) ORDER BY c.updatedAt DESC")
    List<ContentCard> findByTagSlugAndStatus(@Param("tagSlug") String tagSlug, @Param("status") CardStatus status);

    @Query("SELECT DISTINCT c FROM ContentCard c LEFT JOIN FETCH c.tags WHERE EXISTS (SELECT t FROM c.tags t WHERE t.slug = :tagSlug) ORDER BY c.updatedAt DESC")
    List<ContentCard> findByTagSlug(@Param("tagSlug") String tagSlug);

    /**
     * Returns titles of cards where the given tag is their ONLY tag.
     * Used to enforce the "at least one tag" invariant before deleting a tag.
     */
    @Query("SELECT c.title FROM ContentCard c JOIN c.tags t WHERE t.id = :tagId AND SIZE(c.tags) = 1")
    List<String> findCardTitlesWithOnlyTag(@Param("tagId") Long tagId);

    /**
     * Case-insensitive title search for admin typeahead. Excludes the card
     * being edited (to prevent self-links). Returns up to 20 results ordered by title.
     */
    @Query(
            "SELECT c FROM ContentCard c WHERE LOWER(c.title) LIKE LOWER(CONCAT('%', :query, '%'))"
                    + " AND (:excludeId IS NULL OR c.id <> :excludeId) ORDER BY c.title ASC")
    List<ContentCard> searchByTitle(
            @Param("query") String query, @Param("excludeId") Long excludeId,
            org.springframework.data.domain.Pageable pageable);

    default List<ContentCard> searchByTitle(String query, Long excludeId) {
        return searchByTitle(
                query,
                excludeId,
                org.springframework.data.domain.PageRequest.of(0, 20));
    }
}
