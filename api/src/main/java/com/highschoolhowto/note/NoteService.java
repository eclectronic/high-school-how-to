package com.highschoolhowto.note;

import com.highschoolhowto.badge.BadgeService;
import com.highschoolhowto.badge.BadgeTriggerType;
import com.highschoolhowto.note.dto.CreateNoteRequest;
import com.highschoolhowto.note.dto.CreateNoteResponse;
import com.highschoolhowto.note.dto.NoteResponse;
import com.highschoolhowto.note.dto.UpdateNoteRequest;
import com.highschoolhowto.user.User;
import com.highschoolhowto.user.UserRepository;
import com.highschoolhowto.web.ApiException;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class NoteService {

    static final int MAX_NOTES_PER_USER = 20;

    private final NoteRepository noteRepository;
    private final UserRepository userRepository;
    private final BadgeService badgeService;

    public NoteService(NoteRepository noteRepository, UserRepository userRepository, BadgeService badgeService) {
        this.noteRepository = noteRepository;
        this.userRepository = userRepository;
        this.badgeService = badgeService;
    }

    @Transactional(readOnly = true)
    public List<NoteResponse> getNotes(UUID userId) {
        return noteRepository.findByUserIdOrderByCreatedAt(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public CreateNoteResponse createNote(UUID userId, CreateNoteRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found", "User not found"));
        long count = noteRepository.countByUserId(userId);
        if (count >= MAX_NOTES_PER_USER) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Limit reached",
                    "Maximum of " + MAX_NOTES_PER_USER + " notes per user reached");
        }
        Note note = new Note();
        note.setUser(user);
        note.setTitle(request.title().trim());
        note.setContent(request.content());
        if (StringUtils.hasText(request.color())) {
            note.setColor(request.color().trim());
        }
        if (StringUtils.hasText(request.textColor())) {
            note.setTextColor(request.textColor().trim());
        }
        if (StringUtils.hasText(request.fontSize())) {
            note.setFontSize(request.fontSize().trim());
        }
        Note saved = noteRepository.save(note);
        var earnedBadge = badgeService.checkFeatureBadge(user, BadgeTriggerType.FIRST_NOTE);
        return toCreateResponse(saved, earnedBadge.orElse(null));
    }

    @Transactional
    public NoteResponse updateNote(UUID userId, UUID noteId, UpdateNoteRequest request) {
        Note note = requireNote(noteId, userId);
        note.setTitle(request.title().trim());
        note.setContent(request.content());
        note.setColor(StringUtils.hasText(request.color()) ? request.color().trim() : note.getColor());
        note.setTextColor(StringUtils.hasText(request.textColor()) ? request.textColor().trim() : null);
        note.setFontSize(StringUtils.hasText(request.fontSize()) ? request.fontSize().trim() : null);
        return toResponse(noteRepository.save(note));
    }

    @Transactional
    public void deleteNote(UUID userId, UUID noteId) {
        Note note = requireNote(noteId, userId);
        noteRepository.delete(note);
    }

    private Note requireNote(UUID noteId, UUID userId) {
        return noteRepository.findByIdAndUserId(noteId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Note not found", "Note not found for this user"));
    }

    private NoteResponse toResponse(Note note) {
        return new NoteResponse(
                note.getId(),
                note.getTitle(),
                note.getContent(),
                note.getColor(),
                note.getTextColor(),
                note.getFontSize()
        );
    }

    private CreateNoteResponse toCreateResponse(Note note, com.highschoolhowto.badge.dto.EarnedBadgeResponse earnedBadge) {
        return new CreateNoteResponse(
                note.getId(),
                note.getTitle(),
                note.getContent(),
                note.getColor(),
                note.getTextColor(),
                note.getFontSize(),
                earnedBadge
        );
    }
}
