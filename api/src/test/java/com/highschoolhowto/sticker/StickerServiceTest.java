package com.highschoolhowto.sticker;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.highschoolhowto.sticker.dto.CreateStickerRequest;
import com.highschoolhowto.sticker.dto.StickerResponse;
import com.highschoolhowto.sticker.dto.UpdateStickerRequest;
import com.highschoolhowto.user.User;
import com.highschoolhowto.user.UserRepository;
import com.highschoolhowto.web.ApiException;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class StickerServiceTest {

    @Mock
    StickerRepository stickerRepository;

    @Mock
    UserRepository userRepository;

    @InjectMocks
    StickerService service;

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

    private Sticker makeSticker(UUID userId, String emoji, String iconUrl, String label) {
        User user = makeUser(userId);
        Sticker sticker = new Sticker();
        sticker.setUser(user);
        sticker.setEmoji(emoji);
        sticker.setIconUrl(iconUrl);
        sticker.setLabel(label);
        // Simulate @PrePersist
        try {
            var idField = Sticker.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(sticker, UUID.randomUUID());
            var createdAtField = Sticker.class.getDeclaredField("createdAt");
            createdAtField.setAccessible(true);
            createdAtField.set(sticker, Instant.now());
            var updatedAtField = Sticker.class.getDeclaredField("updatedAt");
            updatedAtField.setAccessible(true);
            updatedAtField.set(sticker, Instant.now());
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return sticker;
    }

    // --- createSticker with emoji ---

    @Test
    void createSticker_withEmoji_persists() {
        UUID userId = UUID.randomUUID();
        User user = makeUser(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(stickerRepository.countByUserId(userId)).thenReturn(0L);
        Sticker saved = makeSticker(userId, "⭐", null, "My star");
        when(stickerRepository.save(any(Sticker.class))).thenReturn(saved);

        StickerResponse response = service.createSticker(userId, new CreateStickerRequest("⭐", null, "My star"));

        assertThat(response.emoji()).isEqualTo("⭐");
        assertThat(response.iconUrl()).isNull();
        assertThat(response.label()).isEqualTo("My star");
        verify(stickerRepository).save(any(Sticker.class));
    }

    // --- createSticker with iconUrl ---

    @Test
    void createSticker_withIconUrl_persists() {
        UUID userId = UUID.randomUUID();
        User user = makeUser(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(stickerRepository.countByUserId(userId)).thenReturn(0L);
        Sticker saved = makeSticker(userId, null, "/media/icons/abc.png", null);
        when(stickerRepository.save(any(Sticker.class))).thenReturn(saved);

        StickerResponse response =
                service.createSticker(userId, new CreateStickerRequest(null, "/media/icons/abc.png", null));

        assertThat(response.iconUrl()).isEqualTo("/media/icons/abc.png");
        assertThat(response.emoji()).isNull();
        verify(stickerRepository).save(any(Sticker.class));
    }

    // --- createSticker with both emoji and iconUrl → 400 ---

    @Test
    void createSticker_withBothEmojiAndIconUrl_throwsBadRequest() {
        UUID userId = UUID.randomUUID();

        assertThatThrownBy(() ->
                service.createSticker(userId, new CreateStickerRequest("⭐", "/media/icons/abc.png", null)))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));

        verify(stickerRepository, never()).save(any());
    }

    // --- createSticker with neither → 400 ---

    @Test
    void createSticker_withNeitherEmojiNorIconUrl_throwsBadRequest() {
        UUID userId = UUID.randomUUID();

        assertThatThrownBy(() ->
                service.createSticker(userId, new CreateStickerRequest(null, null, "label only")))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));

        verify(stickerRepository, never()).save(any());
    }

    // --- 50-item per-user limit ---

    @Test
    void createSticker_atLimit_throwsUnprocessableEntity() {
        UUID userId = UUID.randomUUID();
        User user = makeUser(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(stickerRepository.countByUserId(userId)).thenReturn((long) StickerService.MAX_STICKERS_PER_USER);

        assertThatThrownBy(() ->
                service.createSticker(userId, new CreateStickerRequest("⭐", null, null)))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY));

        verify(stickerRepository, never()).save(any());
    }

    // --- updateSticker ---

    @Test
    void updateSticker_changesIconAndLabel() {
        UUID userId = UUID.randomUUID();
        UUID stickerId = UUID.randomUUID();
        Sticker existing = makeSticker(userId, "⭐", null, "old");
        when(stickerRepository.findByIdAndUserId(stickerId, userId)).thenReturn(Optional.of(existing));
        Sticker updated = makeSticker(userId, "🎉", null, "new");
        when(stickerRepository.save(any(Sticker.class))).thenReturn(updated);

        StickerResponse response =
                service.updateSticker(userId, stickerId, new UpdateStickerRequest("🎉", null, "new"));

        assertThat(response.emoji()).isEqualTo("🎉");
        assertThat(response.label()).isEqualTo("new");
        verify(stickerRepository).save(existing);
    }

    // --- deleteSticker ---

    @Test
    void deleteSticker_removesSticker() {
        UUID userId = UUID.randomUUID();
        UUID stickerId = UUID.randomUUID();
        Sticker existing = makeSticker(userId, "⭐", null, null);
        when(stickerRepository.findByIdAndUserId(stickerId, userId)).thenReturn(Optional.of(existing));

        service.deleteSticker(userId, stickerId);

        verify(stickerRepository).delete(existing);
    }

    // --- user isolation ---

    @Test
    void deleteSticker_differentUser_throwsNotFound() {
        UUID userId = UUID.randomUUID();
        UUID otherId = UUID.randomUUID();
        UUID stickerId = UUID.randomUUID();
        when(stickerRepository.findByIdAndUserId(stickerId, otherId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.deleteSticker(otherId, stickerId))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verify(stickerRepository, never()).delete(any());
    }

    @Test
    void updateSticker_differentUser_throwsNotFound() {
        UUID userId = UUID.randomUUID();
        UUID otherId = UUID.randomUUID();
        UUID stickerId = UUID.randomUUID();
        when(stickerRepository.findByIdAndUserId(stickerId, otherId)).thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                service.updateSticker(otherId, stickerId, new UpdateStickerRequest("🎉", null, null)))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verify(stickerRepository, never()).save(any());
    }
}
