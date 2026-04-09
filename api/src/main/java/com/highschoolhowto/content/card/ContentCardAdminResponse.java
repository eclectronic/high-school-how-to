package com.highschoolhowto.content.card;

import com.highschoolhowto.content.tag.Tag;
import com.highschoolhowto.content.tag.TagResponse;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;

public record ContentCardAdminResponse(
        Long id,
        String slug,
        String title,
        String description,
        CardType cardType,
        String mediaUrl,
        String printMediaUrl,
        String thumbnailUrl,
        String coverImageUrl,
        String bodyJson,
        String bodyHtml,
        String backgroundColor,
        String textColor,
        boolean simpleLayout,
        CardStatus status,
        List<TagResponse> tags,
        List<ContentCardTaskResponse> templateTasks,
        Instant createdAt,
        Instant updatedAt) {

    public static ContentCardAdminResponse from(ContentCard card) {
        return new ContentCardAdminResponse(
                card.getId(),
                card.getSlug(),
                card.getTitle(),
                card.getDescription(),
                card.getCardType(),
                card.getMediaUrl(),
                card.getPrintMediaUrl(),
                card.getThumbnailUrl(),
                card.getCoverImageUrl(),
                card.getBodyJson(),
                card.getBodyHtml(),
                card.getBackgroundColor(),
                card.getTextColor(),
                card.isSimpleLayout(),
                card.getStatus(),
                card.getTags().stream()
                        .sorted(Comparator.comparing(Tag::getName))
                        .map(TagResponse::from).toList(),
                card.getTemplateTasks().stream().map(ContentCardTaskResponse::from).toList(),
                card.getCreatedAt(),
                card.getUpdatedAt());
    }
}
