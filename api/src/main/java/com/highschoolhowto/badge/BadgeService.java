package com.highschoolhowto.badge;

import com.highschoolhowto.badge.dto.BadgeResponse;
import com.highschoolhowto.badge.dto.EarnedBadgeResponse;
import com.highschoolhowto.badge.dto.SaveBadgeRequest;
import com.highschoolhowto.user.User;
import com.highschoolhowto.web.ApiException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BadgeService {

    private final BadgeRepository badgeRepository;
    private final EarnedBadgeRepository earnedBadgeRepository;

    public BadgeService(BadgeRepository badgeRepository, EarnedBadgeRepository earnedBadgeRepository) {
        this.badgeRepository = badgeRepository;
        this.earnedBadgeRepository = earnedBadgeRepository;
    }

    // ── Admin CRUD ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<BadgeResponse> listAll() {
        return badgeRepository.findAll().stream().map(BadgeResponse::from).toList();
    }

    @Transactional
    public BadgeResponse create(SaveBadgeRequest request) {
        Badge badge = new Badge();
        applyRequest(badge, request);
        return BadgeResponse.from(badgeRepository.save(badge));
    }

    @Transactional
    public BadgeResponse update(Long id, SaveBadgeRequest request) {
        Badge badge = badgeRepository
                .findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Badge not found", "Badge not found"));
        applyRequest(badge, request);
        return BadgeResponse.from(badgeRepository.save(badge));
    }

    @Transactional
    public void delete(Long id) {
        Badge badge = badgeRepository
                .findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Badge not found", "Badge not found"));
        badgeRepository.delete(badge);
    }

    private void applyRequest(Badge badge, SaveBadgeRequest request) {
        badge.setName(request.name().trim());
        badge.setDescription(request.description());
        badge.setEmoji(request.emoji());
        badge.setIconUrl(request.iconUrl());
        badge.setTriggerType(request.triggerType());
        badge.setTriggerParam(request.triggerParam());
    }

    // ── User earned badges ───────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<EarnedBadgeResponse> getEarnedBadges(UUID userId) {
        return earnedBadgeRepository.findByUserIdOrderByEarnedAtAsc(userId).stream()
                .map(EarnedBadgeResponse::from)
                .toList();
    }

    // ── Badge check logic ────────────────────────────────────────────────────

    /**
     * Check if a checklist-completion badge should be awarded. Called from
     * TaskListService when a task is marked complete and all tasks are done.
     *
     * @param user the user completing the checklist
     * @param sourceContentCardId the content card ID from the task list
     * @return the newly awarded badge, or empty if no badge was awarded
     */
    @Transactional
    public Optional<EarnedBadgeResponse> checkChecklistBadge(User user, Long sourceContentCardId) {
        if (sourceContentCardId == null) {
            return Optional.empty();
        }
        return tryAward(user, BadgeTriggerType.CHECKLIST_COMPLETE, sourceContentCardId.toString());
    }

    /**
     * Check if a feature-usage badge should be awarded. Called from relevant
     * services (e.g. NoteService, StickerService) after creating the resource.
     *
     * @param user the user performing the action
     * @param triggerType the feature trigger type
     * @return the newly awarded badge, or empty if no badge was awarded
     */
    @Transactional
    public Optional<EarnedBadgeResponse> checkFeatureBadge(User user, BadgeTriggerType triggerType) {
        return tryAward(user, triggerType, null);
    }

    private Optional<EarnedBadgeResponse> tryAward(User user, BadgeTriggerType type, String param) {
        Badge badge = badgeRepository
                .findByTriggerTypeAndTriggerParam(type, param)
                .orElse(null);
        if (badge == null) {
            return Optional.empty();
        }
        if (earnedBadgeRepository.existsByUserIdAndBadgeId(user.getId(), badge.getId())) {
            return Optional.empty();
        }
        EarnedBadge earned = new EarnedBadge();
        earned.setUser(user);
        earned.setBadge(badge);
        earnedBadgeRepository.save(earned);
        return Optional.of(EarnedBadgeResponse.from(earned));
    }
}
