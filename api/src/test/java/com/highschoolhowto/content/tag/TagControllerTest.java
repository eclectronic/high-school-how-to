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
    void cardsByTag_delegatesToServiceAndReturnsResponses() {
        ContentCardResponse response = new ContentCardResponse(
                1L, "sat-vs-act-guide", "SAT vs ACT Guide", null,
                CardType.VIDEO, null, null, null, null, null, null, null,
                false, CardStatus.PUBLISHED, List.of(), List.of(), List.of(), null, null);

        when(cardService.findByTagSlugResponses("tests-for-college", true)).thenReturn(List.of(response));

        List<ContentCardResponse> result = controller.cardsByTag("tests-for-college");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).slug()).isEqualTo("sat-vs-act-guide");
        assertThat(result.get(0).cardType()).isEqualTo(CardType.VIDEO);
    }

    @Test
    void cardsByTag_returnsEmptyListWhenNoCardsForTag() {
        when(cardService.findByTagSlugResponses("unknown-tag", true)).thenReturn(List.of());

        List<ContentCardResponse> result = controller.cardsByTag("unknown-tag");

        assertThat(result).isEmpty();
    }
}
