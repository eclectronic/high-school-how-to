package com.highschoolhowto.media;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MediaAssetRepository extends JpaRepository<MediaAsset, Long> {

    Optional<MediaAsset> findByUrl(String url);

    boolean existsByUrl(String url);

    @Query("""
            SELECT m FROM MediaAsset m
            WHERE (:search IS NULL OR :search = ''
               OR lower(m.filename) LIKE lower(concat('%', :search, '%'))
               OR lower(m.altText) LIKE lower(concat('%', :search, '%')))
            ORDER BY m.uploadedAt DESC
            """)
    Page<MediaAsset> search(@Param("search") String search, Pageable pageable);

    @Query("""
            SELECT m FROM MediaAsset m
            WHERE (:search IS NULL OR :search = ''
               OR lower(m.filename) LIKE lower(concat('%', :search, '%'))
               OR lower(m.altText) LIKE lower(concat('%', :search, '%')))
              AND (m.mimeType IS NULL OR m.mimeType LIKE 'image/%')
            ORDER BY m.uploadedAt DESC
            """)
    Page<MediaAsset> searchImages(@Param("search") String search, Pageable pageable);
}
