package com.highschoolhowto.content.tag;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.highschoolhowto.content.card.CardStatus;
import com.highschoolhowto.content.card.CardType;
import com.highschoolhowto.content.card.ContentCard;
import com.highschoolhowto.content.card.ContentCardResponse;
import com.highschoolhowto.content.card.ContentCardService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TagControllerTest {

    @Mock
    TagService tagService;

    @Mock
    ContentCardService cardService;

    @InjectMocks
    TagController controller;

    /** Regression: cardsByTag previously returned List<ContentCard>, causing a compile error. */
    @Test
    void cardsByTag_mapsContentCardsToResponses() {
        ContentCard card = new ContentCard();
        card.setSlug("sat-vs-act-guide");
        card.setTitle("SAT vs ACT Guide");
        card.setCardType(CardType.VIDEO);
        card.setStatus(CardStatus.PUBLISHED);

        when(cardService.findByTagSlug("tests-for-college", true)).thenReturn(List.of(card));

        List<ContentCardResponse> result = controller.cardsByTag("tests-for-college");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).slug()).isEqualTo("sat-vs-act-guide");
        assertThat(result.get(0).cardType()).isEqualTo(CardType.VIDEO);
    }

    @Test
    void cardsByTag_returnsEmptyListWhenNoCardsForTag() {
        when(cardService.findByTagSlug("unknown-tag", true)).thenReturn(List.of());

        List<ContentCardResponse> result = controller.cardsByTag("unknown-tag");

        assertThat(result).isEmpty();
    }
}
