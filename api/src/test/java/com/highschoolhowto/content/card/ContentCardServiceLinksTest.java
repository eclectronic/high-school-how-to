package com.highschoolhowto.content.card;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

import com.highschoolhowto.content.tag.Tag;
import com.highschoolhowto.content.tag.TagRepository;
import com.highschoolhowto.web.ApiException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class ContentCardServiceLinksTest {

    @Mock
    ContentCardRepository cardRepository;

    @Mock
    TagRepository tagRepository;

    @Mock
    HtmlSanitizerService htmlSanitizer;

    @InjectMocks
    ContentCardService service;

    private Tag tag;
    private ContentCard sourceCard;
    private ContentCard targetCard;

    @BeforeEach
    void setup() {
        tag = new Tag();
        setId(tag, 1L);

        sourceCard = new ContentCard();
        setId(sourceCard, 10L);
        sourceCard.setTitle("Source");
        sourceCard.setSlug("source");
        sourceCard.setCardType(CardType.ARTICLE);
        sourceCard.setStatus(CardStatus.PUBLISHED);

        targetCard = new ContentCard();
        setId(targetCard, 20L);
        targetCard.setTitle("Target");
        targetCard.setSlug("target");
        targetCard.setCardType(CardType.VIDEO);
        targetCard.setStatus(CardStatus.PUBLISHED);
    }

    private SaveCardRequest buildRequest(List<ContentCardLinkRequest> links) {
        return new SaveCardRequest(
                "Source",
                "source",
                null,
                CardType.ARTICLE,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                false,
                CardStatus.PUBLISHED,
                List.of(1L),
                links,
                null);
    }

    @Test
    void update_persistsLinksInOrder() {
        ContentCard extra = new ContentCard();
        setId(extra, 30L);
        extra.setTitle("Extra");
        extra.setSlug("extra");
        extra.setCardType(CardType.INFOGRAPHIC);
        extra.setStatus(CardStatus.PUBLISHED);

        when(cardRepository.findByIdWithTags(10L)).thenReturn(Optional.of(sourceCard));
        when(tagRepository.findAllById(List.of(1L))).thenReturn(List.of(tag));
        when(htmlSanitizer.sanitize(any())).thenReturn(null);
        when(cardRepository.findAllById(List.of(20L, 30L))).thenReturn(List.of(targetCard, extra));
        when(cardRepository.save(any(ContentCard.class))).thenAnswer(inv -> inv.getArgument(0));

        List<ContentCardLinkRequest> links = List.of(
                new ContentCardLinkRequest(20L, "Watch this video", 0),
                new ContentCardLinkRequest(30L, null, 1));

        service.update(10L, buildRequest(links));

        assertThat(sourceCard.getLinks()).hasSize(2);
        assertThat(sourceCard.getLinks().get(0).getTargetCard().getId()).isEqualTo(20L);
        assertThat(sourceCard.getLinks().get(0).getLinkText()).isEqualTo("Watch this video");
        assertThat(sourceCard.getLinks().get(1).getSortOrder()).isEqualTo(1);
    }

    @Test
    void update_rejectsSelfLink() {
        when(cardRepository.findByIdWithTags(10L)).thenReturn(Optional.of(sourceCard));
        when(tagRepository.findAllById(anyList())).thenReturn(List.of(tag));
        when(htmlSanitizer.sanitize(any())).thenReturn(null);

        List<ContentCardLinkRequest> links = List.of(new ContentCardLinkRequest(10L, null, 0));

        assertThatThrownBy(() -> service.update(10L, buildRequest(links)))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void update_rejectsDuplicateTarget() {
        when(cardRepository.findByIdWithTags(10L)).thenReturn(Optional.of(sourceCard));
        when(tagRepository.findAllById(anyList())).thenReturn(List.of(tag));
        when(htmlSanitizer.sanitize(any())).thenReturn(null);

        List<ContentCardLinkRequest> links = List.of(
                new ContentCardLinkRequest(20L, null, 0),
                new ContentCardLinkRequest(20L, "duplicate", 1));

        assertThatThrownBy(() -> service.update(10L, buildRequest(links)))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void update_rejectsMoreThanMaxLinks() {
        when(cardRepository.findByIdWithTags(10L)).thenReturn(Optional.of(sourceCard));
        when(tagRepository.findAllById(anyList())).thenReturn(List.of(tag));
        when(htmlSanitizer.sanitize(any())).thenReturn(null);

        List<ContentCardLinkRequest> links = new ArrayList<>();
        for (int i = 1; i <= ContentCardService.MAX_LINKS_PER_CARD + 1; i++) {
            links.add(new ContentCardLinkRequest((long) (100 + i), null, i));
        }

        assertThatThrownBy(() -> service.update(10L, buildRequest(links)))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void update_linkTextDefaultsToTargetTitleWhenBlank() {
        when(cardRepository.findByIdWithTags(10L)).thenReturn(Optional.of(sourceCard));
        when(tagRepository.findAllById(List.of(1L))).thenReturn(List.of(tag));
        when(htmlSanitizer.sanitize(any())).thenReturn(null);
        when(cardRepository.findAllById(List.of(20L))).thenReturn(List.of(targetCard));
        when(cardRepository.save(any(ContentCard.class))).thenAnswer(inv -> inv.getArgument(0));

        List<ContentCardLinkRequest> links =
                List.of(new ContentCardLinkRequest(20L, "  ", 0));

        service.update(10L, buildRequest(links));

        ContentCardLink link = sourceCard.getLinks().get(0);
        // linkText stored as-is; ContentCardLinkResponse.from() resolves blank → target title
        ContentCardLinkResponse response = ContentCardLinkResponse.from(link);
        assertThat(response.linkText()).isEqualTo("Target");
    }

    @Test
    void contentCardResponse_filtersUnpublishedTargets() {
        ContentCard unpublishedTarget = new ContentCard();
        setId(unpublishedTarget, 99L);
        unpublishedTarget.setTitle("Draft");
        unpublishedTarget.setSlug("draft");
        unpublishedTarget.setCardType(CardType.ARTICLE);
        unpublishedTarget.setStatus(CardStatus.DRAFT);

        ContentCardLink publishedLink = new ContentCardLink();
        publishedLink.setSourceCard(sourceCard);
        publishedLink.setTargetCard(targetCard);
        publishedLink.setSortOrder(0);

        ContentCardLink draftLink = new ContentCardLink();
        draftLink.setSourceCard(sourceCard);
        draftLink.setTargetCard(unpublishedTarget);
        draftLink.setSortOrder(1);

        sourceCard.setLinks(new ArrayList<>(List.of(publishedLink, draftLink)));
        sourceCard.setTags(new ArrayList<>());

        ContentCardResponse response = ContentCardResponse.from(sourceCard);
        assertThat(response.links()).hasSize(1);
        assertThat(response.links().get(0).targetSlug()).isEqualTo("target");
    }

    @Test
    void contentCardAdminResponse_includesAllLinks() {
        ContentCard unpublishedTarget = new ContentCard();
        setId(unpublishedTarget, 99L);
        unpublishedTarget.setTitle("Draft");
        unpublishedTarget.setSlug("draft");
        unpublishedTarget.setCardType(CardType.ARTICLE);
        unpublishedTarget.setStatus(CardStatus.DRAFT);

        ContentCardLink publishedLink = new ContentCardLink();
        publishedLink.setSourceCard(sourceCard);
        publishedLink.setTargetCard(targetCard);
        publishedLink.setSortOrder(0);

        ContentCardLink draftLink = new ContentCardLink();
        draftLink.setSourceCard(sourceCard);
        draftLink.setTargetCard(unpublishedTarget);
        draftLink.setSortOrder(1);

        sourceCard.setLinks(new ArrayList<>(List.of(publishedLink, draftLink)));
        sourceCard.setTags(new ArrayList<>());

        ContentCardAdminResponse response = ContentCardAdminResponse.from(sourceCard);
        assertThat(response.links()).hasSize(2);
    }

    @Test
    void searchCards_returnsMatchingCards() {
        when(cardRepository.searchByTitle("target", null)).thenReturn(List.of(targetCard));

        List<ContentCardSummary> results = service.searchCards("target", null);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).slug()).isEqualTo("target");
    }

    @Test
    void searchCards_excludesSpecifiedCard() {
        when(cardRepository.searchByTitle("source", 10L)).thenReturn(List.of());

        List<ContentCardSummary> results = service.searchCards("source", 10L);

        assertThat(results).isEmpty();
    }

    // ---- helpers ----

    private static void setId(Object entity, Long id) {
        try {
            var field = entity.getClass().getDeclaredField("id");
            field.setAccessible(true);
            field.set(entity, id);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
