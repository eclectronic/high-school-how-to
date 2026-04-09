package com.highschoolhowto.sticker;

import com.highschoolhowto.badge.BadgeService;
import com.highschoolhowto.badge.BadgeTriggerType;
import com.highschoolhowto.sticker.dto.CreateStickerRequest;
import com.highschoolhowto.sticker.dto.CreateStickerResponse;
import com.highschoolhowto.sticker.dto.StickerResponse;
import com.highschoolhowto.sticker.dto.UpdateStickerRequest;
import com.highschoolhowto.user.User;
import com.highschoolhowto.user.UserRepository;
import com.highschoolhowto.web.ApiException;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StickerService {

    static final int MAX_STICKERS_PER_USER = 50;

    private final StickerRepository stickerRepository;
    private final UserRepository userRepository;
    private final BadgeService badgeService;

    public StickerService(StickerRepository stickerRepository, UserRepository userRepository, BadgeService badgeService) {
        this.stickerRepository = stickerRepository;
        this.userRepository = userRepository;
        this.badgeService = badgeService;
    }

    @Transactional(readOnly = true)
    public List<StickerResponse> getStickers(UUID userId) {
        return stickerRepository.findByUserIdOrderByCreatedAtAsc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public CreateStickerResponse createSticker(UUID userId, CreateStickerRequest request) {
        validateIconConstraint(request.emoji(), request.iconUrl());
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found", "User not found"));
        long count = stickerRepository.countByUserId(userId);
        if (count >= MAX_STICKERS_PER_USER) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Limit reached",
                    "Maximum of " + MAX_STICKERS_PER_USER + " stickers reached");
        }
        Sticker sticker = new Sticker();
        sticker.setUser(user);
        sticker.setEmoji(request.emoji());
        sticker.setIconUrl(request.iconUrl());
        sticker.setLabel(request.label());
        Sticker saved = stickerRepository.save(sticker);
        var earnedBadge = badgeService.checkFeatureBadge(user, BadgeTriggerType.FIRST_STICKER);
        return toCreateResponse(saved, earnedBadge.orElse(null));
    }

    @Transactional
    public StickerResponse updateSticker(UUID userId, UUID stickerId, UpdateStickerRequest request) {
        validateIconConstraint(request.emoji(), request.iconUrl());
        Sticker sticker = requireSticker(stickerId, userId);
        sticker.setEmoji(request.emoji());
        sticker.setIconUrl(request.iconUrl());
        sticker.setLabel(request.label());
        return toResponse(stickerRepository.save(sticker));
    }

    @Transactional
    public void deleteSticker(UUID userId, UUID stickerId) {
        Sticker sticker = requireSticker(stickerId, userId);
        stickerRepository.delete(sticker);
    }

    private void validateIconConstraint(String emoji, String iconUrl) {
        boolean hasEmoji = emoji != null && !emoji.isBlank();
        boolean hasIconUrl = iconUrl != null && !iconUrl.isBlank();
        if (hasEmoji && hasIconUrl) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid sticker",
                    "Exactly one of emoji or iconUrl must be provided, not both");
        }
        if (!hasEmoji && !hasIconUrl) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid sticker",
                    "Exactly one of emoji or iconUrl must be provided");
        }
    }

    private Sticker requireSticker(UUID stickerId, UUID userId) {
        return stickerRepository.findByIdAndUserId(stickerId, userId)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND, "Sticker not found", "Sticker not found for this user"));
    }

    private StickerResponse toResponse(Sticker sticker) {
        return new StickerResponse(
                sticker.getId(),
                sticker.getEmoji(),
                sticker.getIconUrl(),
                sticker.getLabel(),
                sticker.getCreatedAt(),
                sticker.getUpdatedAt()
        );
    }

    private CreateStickerResponse toCreateResponse(
            Sticker sticker, com.highschoolhowto.badge.dto.EarnedBadgeResponse earnedBadge) {
        return new CreateStickerResponse(
                sticker.getId(),
                sticker.getEmoji(),
                sticker.getIconUrl(),
                sticker.getLabel(),
                earnedBadge
        );
    }
}
