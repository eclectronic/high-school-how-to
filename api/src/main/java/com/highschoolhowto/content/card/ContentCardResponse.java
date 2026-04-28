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
        List<MediaUrlEntry> mediaUrls,
        String thumbnailUrl,
        String coverImageUrl,
        String bodyHtml,
        String backgroundColor,
        String textColor,
        boolean simpleLayout,
        CardStatus status,
        List<TagResponse> tags,
        List<ContentCardLinkResponse> links,
        List<ContentCardTaskResponse> templateTasks,
        Instant createdAt,
        Instant updatedAt) {

    /** Builds a public response — only published target links are included. */
    public static ContentCardResponse from(ContentCard card) {
        List<ContentCardLinkResponse> publishedLinks =
                card.getLinks().stream()
                        .filter(l -> l.getTargetCard().getStatus() == CardStatus.PUBLISHED)
                        .map(ContentCardLinkResponse::from)
                        .toList();
        return new ContentCardResponse(
                card.getId(),
                card.getSlug(),
                card.getTitle(),
                card.getDescription(),
                card.getCardType(),
                card.getMediaUrl(),
                card.getPrintMediaUrl(),
                card.getMediaUrls(),
                card.getThumbnailUrl(),
                card.getCoverImageUrl(),
                card.getBodyHtml(),
                card.getBackgroundColor(),
                card.getTextColor(),
                card.isSimpleLayout(),
                card.getStatus(),
                card.getTags().stream()
                        .sorted(Comparator.comparing(Tag::getName))
                        .map(TagResponse::from)
                        .toList(),
                publishedLinks,
                card.getTemplateTasks().stream().map(ContentCardTaskResponse::from).toList(),
                card.getCreatedAt(),
                card.getUpdatedAt());
    }
}
