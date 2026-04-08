package com.highschoolhowto.content.card;

public record ContentCardSummary(
        Long id, String title, String slug, CardType cardType, CardStatus status) {

    public static ContentCardSummary from(ContentCard card) {
        return new ContentCardSummary(
                card.getId(), card.getTitle(), card.getSlug(), card.getCardType(), card.getStatus());
    }
}
