package com.highschoolhowto.note;

import com.highschoolhowto.note.dto.CreateNoteRequest;
import com.highschoolhowto.note.dto.NoteResponse;
import com.highschoolhowto.note.dto.UpdateNoteRequest;
import com.highschoolhowto.security.UserPrincipal;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notes")
public class NoteController {

    private final NoteService noteService;

    public NoteController(NoteService noteService) {
        this.noteService = noteService;
    }

    @GetMapping
    public ResponseEntity<List<NoteResponse>> all(@AuthenticationPrincipal UserPrincipal principal) {
        UUID userId = principal.getUser().getId();
        return ResponseEntity.ok(noteService.getNotes(userId));
    }

    @PostMapping
    public ResponseEntity<NoteResponse> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateNoteRequest request) {
        UUID userId = principal.getUser().getId();
        return ResponseEntity.ok(noteService.createNote(userId, request));
    }

    @PutMapping("/{noteId}")
    public ResponseEntity<NoteResponse> update(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("noteId") UUID noteId,
            @Valid @RequestBody UpdateNoteRequest request) {
        UUID userId = principal.getUser().getId();
        return ResponseEntity.ok(noteService.updateNote(userId, noteId, request));
    }

    @DeleteMapping("/{noteId}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("noteId") UUID noteId) {
        UUID userId = principal.getUser().getId();
        noteService.deleteNote(userId, noteId);
        return ResponseEntity.noContent().build();
    }
}
