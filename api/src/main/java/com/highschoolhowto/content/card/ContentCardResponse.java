package com.highschoolhowto.content.card;

import com.highschoolhowto.content.tag.Tag;
import com.highschoolhowto.content.tag.TagResponse;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;

public record ContentCardResponse(
        Long id,
        String slug,
        String title,
        String description,
        CardType cardType,
        String mediaUrl,
        String printMediaUrl,
        String thumbnailUrl,
        String coverImageUrl,
        String bodyHtml,
        String backgroundColor,
        String textColor,
        boolean simpleLayout,
        CardStatus status,
        List<TagResponse> tags,
        List<ContentCardTaskResponse> templateTasks,
        Instant createdAt,
        Instant updatedAt) {

    public static ContentCardResponse from(ContentCard card) {
        return new ContentCardResponse(
                card.getId(),
                card.getSlug(),
                card.getTitle(),
                card.getDescription(),
                card.getCardType(),
                card.getMediaUrl(),
                card.getPrintMediaUrl(),
                card.getThumbnailUrl(),
                card.getCoverImageUrl(),
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
