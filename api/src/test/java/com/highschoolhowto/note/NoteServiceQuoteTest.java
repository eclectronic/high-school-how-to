package com.highschoolhowto.note;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.highschoolhowto.badge.BadgeService;
import com.highschoolhowto.note.dto.CreateNoteRequest;
import com.highschoolhowto.user.User;
import com.highschoolhowto.user.UserRepository;
import com.highschoolhowto.web.ApiException;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class NoteServiceQuoteTest {

    @Mock
    NoteRepository noteRepository;

    @Mock
    UserRepository userRepository;

    @Mock
    BadgeService badgeService;

    @InjectMocks
    NoteService noteService;

    private User makeUser(UUID userId) {
        User user = new User();
        try {
            var field = User.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(user, userId);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return user;
    }

    private Note makeNote(UUID userId, NoteType noteType) {
        User user = makeUser(userId);
        Note note = new Note();
        note.setUser(user);
        note.setTitle("Quote of the Day");
        note.setNoteType(noteType);
        note.setColor("#fef3c7");
        return note;
    }

    @Test
    void createNote_allowsFirstQuoteNote() {
        UUID userId = UUID.randomUUID();
        User user = makeUser(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(noteRepository.countByUserId(userId)).thenReturn(0L);
        when(noteRepository.countByUserIdAndNoteType(userId, NoteType.QUOTE)).thenReturn(0L);

        Note saved = makeNote(userId, NoteType.QUOTE);
        when(noteRepository.save(any(Note.class))).thenReturn(saved);

        var response = noteService.createNote(userId,
                new CreateNoteRequest("Quote of the Day", null, null, null, null, NoteType.QUOTE));

        assertThat(response.noteType()).isEqualTo(NoteType.QUOTE);
        verify(noteRepository).save(any(Note.class));
    }

    @Test
    void createNote_rejectsSecondQuoteNote() {
        UUID userId = UUID.randomUUID();
        User user = makeUser(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(noteRepository.countByUserId(userId)).thenReturn(1L);
        when(noteRepository.countByUserIdAndNoteType(userId, NoteType.QUOTE)).thenReturn(1L);

        assertThatThrownBy(() -> noteService.createNote(userId,
                new CreateNoteRequest("Quote of the Day #2", null, null, null, null, NoteType.QUOTE)))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY));

        verify(noteRepository, never()).save(any());
    }

    @Test
    void createNote_regularNoteIgnoresQuoteLimit() {
        UUID userId = UUID.randomUUID();
        User user = makeUser(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(noteRepository.countByUserId(userId)).thenReturn(1L);

        Note saved = makeNote(userId, NoteType.REGULAR);
        saved.setContent("content");
        when(noteRepository.save(any(Note.class))).thenReturn(saved);

        var response = noteService.createNote(userId,
                new CreateNoteRequest("Note", "content", null, null, null, NoteType.REGULAR));

        assertThat(response.noteType()).isEqualTo(NoteType.REGULAR);
        verify(noteRepository).save(any(Note.class));
    }

    @Test
    void createNote_quoteNoteDoesNotStoreContent() {
        UUID userId = UUID.randomUUID();
        User user = makeUser(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(noteRepository.countByUserId(userId)).thenReturn(0L);
        when(noteRepository.countByUserIdAndNoteType(userId, NoteType.QUOTE)).thenReturn(0L);

        when(noteRepository.save(any(Note.class))).thenAnswer(inv -> inv.getArgument(0));

        noteService.createNote(userId,
                new CreateNoteRequest("Quote of the Day", "some content", null, null, null, NoteType.QUOTE));

        // The content should not be set for QUOTE notes — verified via the save argument
        ArgumentCaptor<Note> captor = ArgumentCaptor.forClass(Note.class);
        verify(noteRepository).save(captor.capture());
        assertThat(captor.getValue().getContent()).isNull();
    }
}
