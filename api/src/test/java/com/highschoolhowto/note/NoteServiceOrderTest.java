package com.highschoolhowto.note;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.highschoolhowto.badge.BadgeService;
import com.highschoolhowto.note.dto.CreateNoteRequest;
import com.highschoolhowto.note.dto.ReorderNotesRequest;
import com.highschoolhowto.user.User;
import com.highschoolhowto.user.UserRepository;
import java.lang.reflect.Field;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class NoteServiceOrderTest {

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
        setField(user, "id", userId);
        return user;
    }

    private Note makeNote(UUID id, User user, int sortOrder) {
        Note n = new Note();
        setField(n, "id", id);
        n.setUser(user);
        n.setTitle("n" + sortOrder);
        n.setColor("#fef3c7");
        n.setNoteType(NoteType.REGULAR);
        n.setSortOrder(sortOrder);
        setField(n, "createdAt", Instant.EPOCH);
        setField(n, "updatedAt", Instant.EPOCH);
        return n;
    }

    private static void setField(Object target, String field, Object value) {
        try {
            Field f = findField(target.getClass(), field);
            f.setAccessible(true);
            f.set(target, value);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private static Field findField(Class<?> cls, String name) throws NoSuchFieldException {
        Class<?> c = cls;
        while (c != null) {
            try {
                return c.getDeclaredField(name);
            } catch (NoSuchFieldException ignored) {
                c = c.getSuperclass();
            }
        }
        throw new NoSuchFieldException(name);
    }

    @Test
    void reorderNotes_assignsSequentialOrderMatchingRequestedIds() {
        UUID userId = UUID.randomUUID();
        User user = makeUser(userId);
        Note a = makeNote(UUID.randomUUID(), user, 0);
        Note b = makeNote(UUID.randomUUID(), user, 1);
        Note c = makeNote(UUID.randomUUID(), user, 2);

        when(noteRepository.findByUserIdOrderBySortOrderAscCreatedAtDesc(userId))
                .thenReturn(List.of(a, b, c));

        // Reverse the order
        noteService.reorderNotes(userId, new ReorderNotesRequest(List.of(c.getId(), b.getId(), a.getId())));

        assertThat(c.getSortOrder()).isEqualTo(0);
        assertThat(b.getSortOrder()).isEqualTo(1);
        assertThat(a.getSortOrder()).isEqualTo(2);
        verify(noteRepository).saveAll(List.of(a, b, c));
    }

    @Test
    void reorderNotes_ignoresUnknownIds() {
        UUID userId = UUID.randomUUID();
        User user = makeUser(userId);
        Note a = makeNote(UUID.randomUUID(), user, 0);
        Note b = makeNote(UUID.randomUUID(), user, 1);

        when(noteRepository.findByUserIdOrderBySortOrderAscCreatedAtDesc(userId))
                .thenReturn(List.of(a, b));

        UUID strangerId = UUID.randomUUID(); // not in the owned list — e.g. another user's note
        noteService.reorderNotes(userId, new ReorderNotesRequest(List.of(b.getId(), strangerId, a.getId())));

        // b gets position 0, strangerId is skipped so position counter stays at 1, a gets position 1
        assertThat(b.getSortOrder()).isEqualTo(0);
        assertThat(a.getSortOrder()).isEqualTo(1);
    }

    @Test
    void createNote_shiftsExistingNotesDownAndPlacesNewNoteAtTop() {
        UUID userId = UUID.randomUUID();
        User user = makeUser(userId);
        Note a = makeNote(UUID.randomUUID(), user, 0);
        Note b = makeNote(UUID.randomUUID(), user, 1);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(noteRepository.countByUserId(userId)).thenReturn(2L);
        when(noteRepository.findByUserIdOrderBySortOrderAscCreatedAtDesc(userId))
                .thenReturn(List.of(a, b));
        when(noteRepository.save(any(Note.class))).thenAnswer(inv -> inv.getArgument(0));

        noteService.createNote(userId, new CreateNoteRequest("New", null, null, null, null, NoteType.REGULAR));

        assertThat(a.getSortOrder()).isEqualTo(1);
        assertThat(b.getSortOrder()).isEqualTo(2);

        ArgumentCaptor<Note> captor = ArgumentCaptor.forClass(Note.class);
        verify(noteRepository).save(captor.capture());
        assertThat(captor.getValue().getSortOrder()).isEqualTo(0);
    }
}
