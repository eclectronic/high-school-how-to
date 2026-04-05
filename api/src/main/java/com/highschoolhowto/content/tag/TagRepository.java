package com.highschoolhowto.content.tag;

import com.highschoolhowto.content.card.CardStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TagRepository extends JpaRepository<Tag, Long> {

    Optional<Tag> findBySlug(String slug);

    boolean existsBySlug(String slug);

    @Query("SELECT DISTINCT t FROM Tag t WHERE EXISTS (SELECT c FROM ContentCard c JOIN c.tags ct WHERE ct = t AND c.status = :status)")
    List<Tag> findTagsWithCardStatus(@Param("status") CardStatus status);
}
