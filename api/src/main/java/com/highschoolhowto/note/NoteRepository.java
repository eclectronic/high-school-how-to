package com.highschoolhowto.note;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NoteRepository extends JpaRepository<Note, UUID> {
    List<Note> findByUserIdOrderByCreatedAt(UUID userId);
    long countByUserId(UUID userId);
    long countByUserIdAndNoteType(UUID userId, NoteType noteType);
    Optional<Note> findByIdAndUserId(UUID id, UUID userId);
}
