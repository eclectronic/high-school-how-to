package com.highschoolhowto.content.card;

public record ContentCardLinkResponse(
        Long id,
        Long targetCardId,
        String targetSlug,
        String targetTitle,
        CardType targetCardType,
        String linkText,
        int sortOrder) {

    public static ContentCardLinkResponse from(ContentCardLink link) {
        ContentCard target = link.getTargetCard();
        String resolvedText =
                (link.getLinkText() == null || link.getLinkText().isBlank())
                        ? target.getTitle()
                        : link.getLinkText();
        return new ContentCardLinkResponse(
                link.getId(),
                target.getId(),
                target.getSlug(),
                target.getTitle(),
                target.getCardType(),
                resolvedText,
                link.getSortOrder());
    }
}
