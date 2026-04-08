package com.highschoolhowto.shortcut;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.highschoolhowto.shortcut.dto.CreateShortcutRequest;
import com.highschoolhowto.shortcut.dto.ImportShortcutItem;
import com.highschoolhowto.shortcut.dto.ImportShortcutsRequest;
import com.highschoolhowto.shortcut.dto.ImportShortcutsResponse;
import com.highschoolhowto.shortcut.dto.ShortcutResponse;
import com.highschoolhowto.shortcut.dto.UpdateShortcutRequest;
import com.highschoolhowto.user.User;
import com.highschoolhowto.user.UserRepository;
import com.highschoolhowto.web.ApiException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class ShortcutServiceTest {

    @Mock
    ShortcutRepository shortcutRepository;

    @Mock
    UserRepository userRepository;

    @InjectMocks
    ShortcutService service;

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

    private Shortcut makeShortcut(UUID userId, String url, String name) {
        User user = makeUser(userId);
        Shortcut shortcut = new Shortcut();
        shortcut.setUser(user);
        shortcut.setUrl(url);
        shortcut.setName(name);
        return shortcut;
    }

    // --- createShortcut ---

    @Test
    void createShortcut_succeedsWhenUnderLimit() {
        UUID userId = UUID.randomUUID();
        User user = makeUser(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(shortcutRepository.countByUserId(userId))
                .thenReturn(ShortcutService.MAX_SHORTCUTS_PER_USER - 1L);

        Shortcut saved = makeShortcut(userId, "https://example.com", "example.com");
        when(shortcutRepository.save(any(Shortcut.class))).thenReturn(saved);

        ShortcutResponse response = service.createShortcut(
                userId, new CreateShortcutRequest("https://example.com", null, null, null, null));

        assertThat(response.url()).isEqualTo("https://example.com");
        verify(shortcutRepository).save(any(Shortcut.class));
    }

    @Test
    void createShortcut_failsAtLimit() {
        UUID userId = UUID.randomUUID();
        User user = makeUser(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(shortcutRepository.countByUserId(userId))
                .thenReturn((long) ShortcutService.MAX_SHORTCUTS_PER_USER);

        assertThatThrownBy(
                () -> service.createShortcut(
                        userId,
                        new CreateShortcutRequest("https://example.com", null, null, null, null)))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus())
                        .isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY));

        verify(shortcutRepository, never()).save(any());
    }

    @Test
    void createShortcut_usesHostnameWhenNameBlank() {
        UUID userId = UUID.randomUUID();
        User user = makeUser(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(shortcutRepository.countByUserId(userId)).thenReturn(0L);

        Shortcut saved = makeShortcut(userId, "https://khanacademy.org", "khanacademy.org");
        when(shortcutRepository.save(any(Shortcut.class))).thenReturn(saved);

        ShortcutResponse response = service.createShortcut(
                userId,
                new CreateShortcutRequest("https://khanacademy.org", "", null, null, null));

        assertThat(response.name()).isEqualTo("khanacademy.org");
    }

    // --- updateShortcut ---

    @Test
    void updateShortcut_throwsNotFoundForWrongUser() {
        UUID userId = UUID.randomUUID();
        UUID shortcutId = UUID.randomUUID();
        when(shortcutRepository.findByIdAndUserId(shortcutId, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(
                () -> service.updateShortcut(
                        userId,
                        shortcutId,
                        new UpdateShortcutRequest("https://example.com", "Example", null, null, null)))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void updateShortcut_clearsOptionalFieldsWhenNull() {
        UUID userId = UUID.randomUUID();
        UUID shortcutId = UUID.randomUUID();
        Shortcut existing = makeShortcut(userId, "https://example.com", "Old Name");
        existing.setFaviconUrl("https://example.com/favicon.ico");
        existing.setEmoji("🌐");

        when(shortcutRepository.findByIdAndUserId(shortcutId, userId)).thenReturn(Optional.of(existing));
        when(shortcutRepository.save(any(Shortcut.class))).thenAnswer(inv -> inv.getArgument(0));

        ShortcutResponse response = service.updateShortcut(
                userId,
                shortcutId,
                new UpdateShortcutRequest("https://example.com", "New Name", null, null, null));

        assertThat(response.name()).isEqualTo("New Name");
        assertThat(response.faviconUrl()).isNull();
        assertThat(response.emoji()).isNull();
    }

    // --- deleteShortcut ---

    @Test
    void deleteShortcut_throwsNotFoundForWrongUser() {
        UUID userId = UUID.randomUUID();
        UUID shortcutId = UUID.randomUUID();
        when(shortcutRepository.findByIdAndUserId(shortcutId, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.deleteShortcut(userId, shortcutId))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void deleteShortcut_userIsolation() {
        UUID user1Id = UUID.randomUUID();
        UUID user2Id = UUID.randomUUID();
        UUID shortcutId = UUID.randomUUID();

        // shortcut belongs to user1, user2 tries to delete
        when(shortcutRepository.findByIdAndUserId(shortcutId, user2Id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.deleteShortcut(user2Id, shortcutId))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus())
                        .isEqualTo(HttpStatus.NOT_FOUND));

        verify(shortcutRepository, never()).delete(any());
    }

    // --- importShortcuts ---

    @Test
    void importShortcuts_skipsDuplicates() {
        UUID userId = UUID.randomUUID();
        User user = makeUser(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(shortcutRepository.countByUserId(userId)).thenReturn(2L);
        when(shortcutRepository.findUrlsByUserId(userId))
                .thenReturn(List.of("https://example.com"));
        when(shortcutRepository.save(any(Shortcut.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ImportShortcutsRequest req = new ImportShortcutsRequest(
                1,
                List.of(
                        new ImportShortcutItem("https://example.com", "Example", null, null),
                        new ImportShortcutItem("https://google.com", "Google", null, null)));

        ImportShortcutsResponse response = service.importShortcuts(userId, req);

        assertThat(response.imported()).isEqualTo(1);
        assertThat(response.skipped()).isEqualTo(1);
        assertThat(response.reason()).isNull();
    }

    @Test
    void importShortcuts_stopsAtLimit() {
        UUID userId = UUID.randomUUID();
        User user = makeUser(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        // Already at limit - 1
        when(shortcutRepository.countByUserId(userId))
                .thenReturn((long) (ShortcutService.MAX_SHORTCUTS_PER_USER - 1));
        when(shortcutRepository.findUrlsByUserId(userId)).thenReturn(List.of());
        when(shortcutRepository.save(any(Shortcut.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ImportShortcutsRequest req = new ImportShortcutsRequest(
                1,
                List.of(
                        new ImportShortcutItem("https://a.com", "A", null, null),
                        new ImportShortcutItem("https://b.com", "B", null, null)));

        ImportShortcutsResponse response = service.importShortcuts(userId, req);

        assertThat(response.imported()).isEqualTo(1);
        assertThat(response.skipped()).isEqualTo(1);
        assertThat(response.reason()).contains("50");
    }

    @Test
    void importShortcuts_emptyListReturnsZeros() {
        UUID userId = UUID.randomUUID();

        ImportShortcutsResponse response = service.importShortcuts(
                userId, new ImportShortcutsRequest(1, List.of()));

        assertThat(response.imported()).isEqualTo(0);
        assertThat(response.skipped()).isEqualTo(0);
        verify(shortcutRepository, never()).save(any());
    }
}
