package com.highschoolhowto.badge;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.highschoolhowto.badge.dto.BadgeResponse;
import com.highschoolhowto.badge.dto.EarnedBadgeResponse;
import com.highschoolhowto.badge.dto.SaveBadgeRequest;
import com.highschoolhowto.user.User;
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
class BadgeServiceTest {

    @Mock
    BadgeRepository badgeRepository;

    @Mock
    EarnedBadgeRepository earnedBadgeRepository;

    @InjectMocks
    BadgeService service;

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

    private Badge makeBadge(Long id, BadgeTriggerType triggerType, String triggerParam) {
        Badge badge = new Badge();
        try {
            var field = Badge.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(badge, id);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        badge.setName("Test Badge");
        badge.setTriggerType(triggerType);
        badge.setTriggerParam(triggerParam);
        return badge;
    }

    // ── checkFeatureBadge ────────────────────────────────────────────────────

    @Test
    void checkFeatureBadge_awardsWhenBadgeExistsAndNotYetEarned() {
        UUID userId = UUID.randomUUID();
        User user = makeUser(userId);
        Badge badge = makeBadge(1L, BadgeTriggerType.FIRST_NOTE, null);

        when(badgeRepository.findByTriggerTypeAndTriggerParam(BadgeTriggerType.FIRST_NOTE, null))
                .thenReturn(Optional.of(badge));
        when(earnedBadgeRepository.existsByUserIdAndBadgeId(userId, 1L)).thenReturn(false);
        when(earnedBadgeRepository.save(any(EarnedBadge.class))).thenAnswer(inv -> inv.getArgument(0));

        Optional<EarnedBadgeResponse> result = service.checkFeatureBadge(user, BadgeTriggerType.FIRST_NOTE);

        assertThat(result).isPresent();
        assertThat(result.get().badge().triggerType()).isEqualTo(BadgeTriggerType.FIRST_NOTE);
        verify(earnedBadgeRepository).save(any(EarnedBadge.class));
    }

    @Test
    void checkFeatureBadge_returnsEmptyWhenAlreadyEarned() {
        UUID userId = UUID.randomUUID();
        User user = makeUser(userId);
        Badge badge = makeBadge(1L, BadgeTriggerType.FIRST_NOTE, null);

        when(badgeRepository.findByTriggerTypeAndTriggerParam(BadgeTriggerType.FIRST_NOTE, null))
                .thenReturn(Optional.of(badge));
        when(earnedBadgeRepository.existsByUserIdAndBadgeId(userId, 1L)).thenReturn(true);

        Optional<EarnedBadgeResponse> result = service.checkFeatureBadge(user, BadgeTriggerType.FIRST_NOTE);

        assertThat(result).isEmpty();
        verify(earnedBadgeRepository, never()).save(any());
    }

    @Test
    void checkFeatureBadge_returnsEmptyWhenNoBadgeConfigured() {
        UUID userId = UUID.randomUUID();
        User user = makeUser(userId);

        when(badgeRepository.findByTriggerTypeAndTriggerParam(BadgeTriggerType.FIRST_NOTE, null))
                .thenReturn(Optional.empty());

        Optional<EarnedBadgeResponse> result = service.checkFeatureBadge(user, BadgeTriggerType.FIRST_NOTE);

        assertThat(result).isEmpty();
        verify(earnedBadgeRepository, never()).save(any());
    }

    @Test
    void checkFeatureBadge_firstShortcut_awardsFirstTime() {
        UUID userId = UUID.randomUUID();
        User user = makeUser(userId);
        Badge badge = makeBadge(2L, BadgeTriggerType.FIRST_SHORTCUT, null);

        when(badgeRepository.findByTriggerTypeAndTriggerParam(BadgeTriggerType.FIRST_SHORTCUT, null))
                .thenReturn(Optional.of(badge));
        when(earnedBadgeRepository.existsByUserIdAndBadgeId(userId, 2L)).thenReturn(false);
        when(earnedBadgeRepository.save(any(EarnedBadge.class))).thenAnswer(inv -> inv.getArgument(0));

        Optional<EarnedBadgeResponse> result = service.checkFeatureBadge(user, BadgeTriggerType.FIRST_SHORTCUT);

        assertThat(result).isPresent();
        verify(earnedBadgeRepository).save(any(EarnedBadge.class));
    }

    @Test
    void checkFeatureBadge_firstShortcut_noDuplicateOnSecondCall() {
        UUID userId = UUID.randomUUID();
        User user = makeUser(userId);
        Badge badge = makeBadge(2L, BadgeTriggerType.FIRST_SHORTCUT, null);

        when(badgeRepository.findByTriggerTypeAndTriggerParam(BadgeTriggerType.FIRST_SHORTCUT, null))
                .thenReturn(Optional.of(badge));
        when(earnedBadgeRepository.existsByUserIdAndBadgeId(userId, 2L)).thenReturn(true);

        Optional<EarnedBadgeResponse> result = service.checkFeatureBadge(user, BadgeTriggerType.FIRST_SHORTCUT);

        assertThat(result).isEmpty();
        verify(earnedBadgeRepository, never()).save(any());
    }

    @Test
    void checkFeatureBadge_firstTimer_awardsOnCompletion() {
        UUID userId = UUID.randomUUID();
        User user = makeUser(userId);
        Badge badge = makeBadge(3L, BadgeTriggerType.FIRST_TIMER, null);

        when(badgeRepository.findByTriggerTypeAndTriggerParam(BadgeTriggerType.FIRST_TIMER, null))
                .thenReturn(Optional.of(badge));
        when(earnedBadgeRepository.existsByUserIdAndBadgeId(userId, 3L)).thenReturn(false);
        when(earnedBadgeRepository.save(any(EarnedBadge.class))).thenAnswer(inv -> inv.getArgument(0));

        Optional<EarnedBadgeResponse> result = service.checkFeatureBadge(user, BadgeTriggerType.FIRST_TIMER);

        assertThat(result).isPresent();
    }

    @Test
    void checkFeatureBadge_firstSticker_awardsFirstTime() {
        UUID userId = UUID.randomUUID();
        User user = makeUser(userId);
        Badge badge = makeBadge(4L, BadgeTriggerType.FIRST_STICKER, null);

        when(badgeRepository.findByTriggerTypeAndTriggerParam(BadgeTriggerType.FIRST_STICKER, null))
                .thenReturn(Optional.of(badge));
        when(earnedBadgeRepository.existsByUserIdAndBadgeId(userId, 4L)).thenReturn(false);
        when(earnedBadgeRepository.save(any(EarnedBadge.class))).thenAnswer(inv -> inv.getArgument(0));

        Optional<EarnedBadgeResponse> result = service.checkFeatureBadge(user, BadgeTriggerType.FIRST_STICKER);

        assertThat(result).isPresent();
    }

    @Test
    void checkFeatureBadge_firstStudySession_awardsFirstTime() {
        UUID userId = UUID.randomUUID();
        User user = makeUser(userId);
        Badge badge = makeBadge(5L, BadgeTriggerType.FIRST_STUDY_SESSION, null);

        when(badgeRepository.findByTriggerTypeAndTriggerParam(BadgeTriggerType.FIRST_STUDY_SESSION, null))
                .thenReturn(Optional.of(badge));
        when(earnedBadgeRepository.existsByUserIdAndBadgeId(userId, 5L)).thenReturn(false);
        when(earnedBadgeRepository.save(any(EarnedBadge.class))).thenAnswer(inv -> inv.getArgument(0));

        Optional<EarnedBadgeResponse> result = service.checkFeatureBadge(user, BadgeTriggerType.FIRST_STUDY_SESSION);

        assertThat(result).isPresent();
    }

    @Test
    void checkFeatureBadge_firstTodoList_awardsOnFirstCompletion() {
        UUID userId = UUID.randomUUID();
        User user = makeUser(userId);
        Badge badge = makeBadge(6L, BadgeTriggerType.FIRST_TODO_LIST, null);

        when(badgeRepository.findByTriggerTypeAndTriggerParam(BadgeTriggerType.FIRST_TODO_LIST, null))
                .thenReturn(Optional.of(badge));
        when(earnedBadgeRepository.existsByUserIdAndBadgeId(userId, 6L)).thenReturn(false);
        when(earnedBadgeRepository.save(any(EarnedBadge.class))).thenAnswer(inv -> inv.getArgument(0));

        Optional<EarnedBadgeResponse> result = service.checkFeatureBadge(user, BadgeTriggerType.FIRST_TODO_LIST);

        assertThat(result).isPresent();
    }

    // ── checkChecklistBadge ──────────────────────────────────────────────────

    @Test
    void checkChecklistBadge_awardsWhenBadgeExistsForContentCard() {
        UUID userId = UUID.randomUUID();
        User user = makeUser(userId);
        Long contentCardId = 42L;
        Badge badge = makeBadge(10L, BadgeTriggerType.CHECKLIST_COMPLETE, "42");

        when(badgeRepository.findByTriggerTypeAndTriggerParam(
                BadgeTriggerType.CHECKLIST_COMPLETE, "42"))
                .thenReturn(Optional.of(badge));
        when(earnedBadgeRepository.existsByUserIdAndBadgeId(userId, 10L)).thenReturn(false);
        when(earnedBadgeRepository.save(any(EarnedBadge.class))).thenAnswer(inv -> inv.getArgument(0));

        Optional<EarnedBadgeResponse> result = service.checkChecklistBadge(user, contentCardId);

        assertThat(result).isPresent();
        assertThat(result.get().badge().triggerType()).isEqualTo(BadgeTriggerType.CHECKLIST_COMPLETE);
        verify(earnedBadgeRepository).save(any(EarnedBadge.class));
    }

    @Test
    void checkChecklistBadge_returnsEmptyWhenSourceCardIdIsNull() {
        UUID userId = UUID.randomUUID();
        User user = makeUser(userId);

        Optional<EarnedBadgeResponse> result = service.checkChecklistBadge(user, null);

        assertThat(result).isEmpty();
        verify(badgeRepository, never()).findByTriggerTypeAndTriggerParam(any(), any());
    }

    @Test
    void checkChecklistBadge_returnsEmptyWhenNoBadgeForCard() {
        UUID userId = UUID.randomUUID();
        User user = makeUser(userId);

        when(badgeRepository.findByTriggerTypeAndTriggerParam(
                BadgeTriggerType.CHECKLIST_COMPLETE, "99"))
                .thenReturn(Optional.empty());

        Optional<EarnedBadgeResponse> result = service.checkChecklistBadge(user, 99L);

        assertThat(result).isEmpty();
        verify(earnedBadgeRepository, never()).save(any());
    }

    @Test
    void checkChecklistBadge_idempotentWhenAlreadyEarned() {
        UUID userId = UUID.randomUUID();
        User user = makeUser(userId);
        Badge badge = makeBadge(10L, BadgeTriggerType.CHECKLIST_COMPLETE, "42");

        when(badgeRepository.findByTriggerTypeAndTriggerParam(
                BadgeTriggerType.CHECKLIST_COMPLETE, "42"))
                .thenReturn(Optional.of(badge));
        when(earnedBadgeRepository.existsByUserIdAndBadgeId(userId, 10L)).thenReturn(true);

        Optional<EarnedBadgeResponse> result = service.checkChecklistBadge(user, 42L);

        assertThat(result).isEmpty();
        verify(earnedBadgeRepository, never()).save(any());
    }

    // ── Admin CRUD ───────────────────────────────────────────────────────────

    @Test
    void create_persistsBadgeWithAllFields() {
        Badge saved = makeBadge(1L, BadgeTriggerType.FIRST_NOTE, null);
        saved.setName("First Note");
        saved.setDescription("Created your first note");
        saved.setEmoji("📝");
        when(badgeRepository.save(any(Badge.class))).thenReturn(saved);

        BadgeResponse response = service.create(new SaveBadgeRequest(
                "First Note", "Created your first note", "📝", null, BadgeTriggerType.FIRST_NOTE, null));

        assertThat(response.name()).isEqualTo("First Note");
        assertThat(response.emoji()).isEqualTo("📝");
        assertThat(response.triggerType()).isEqualTo(BadgeTriggerType.FIRST_NOTE);
        verify(badgeRepository).save(any(Badge.class));
    }

    @Test
    void update_throwsWhenBadgeNotFound() {
        when(badgeRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update(999L,
                new SaveBadgeRequest("Name", null, null, null, BadgeTriggerType.FIRST_NOTE, null)))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void delete_throwsWhenBadgeNotFound() {
        when(badgeRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(999L))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void listAll_returnsAllBadges() {
        Badge b1 = makeBadge(1L, BadgeTriggerType.FIRST_NOTE, null);
        Badge b2 = makeBadge(2L, BadgeTriggerType.FIRST_STICKER, null);
        when(badgeRepository.findAll()).thenReturn(List.of(b1, b2));

        List<BadgeResponse> result = service.listAll();

        assertThat(result).hasSize(2);
    }

    @Test
    void getEarnedBadges_returnsUserBadges() {
        UUID userId = UUID.randomUUID();
        when(earnedBadgeRepository.findByUserIdOrderByEarnedAtAsc(userId)).thenReturn(List.of());

        List<EarnedBadgeResponse> result = service.getEarnedBadges(userId);

        assertThat(result).isEmpty();
        verify(earnedBadgeRepository).findByUserIdOrderByEarnedAtAsc(userId);
    }
}
