package com.highschoolhowto.sticker;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StickerRepository extends JpaRepository<Sticker, UUID> {
    List<Sticker> findByUserIdOrderByCreatedAtAsc(UUID userId);
    long countByUserId(UUID userId);
    Optional<Sticker> findByIdAndUserId(UUID id, UUID userId);
}
