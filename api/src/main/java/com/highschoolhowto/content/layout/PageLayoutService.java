package com.highschoolhowto.content.layout;

import com.highschoolhowto.content.card.CardStatus;
import com.highschoolhowto.content.card.ContentCardRepository;
import com.highschoolhowto.content.card.ContentCardResponse;
import com.highschoolhowto.content.tag.Tag;
import com.highschoolhowto.content.tag.TagRepository;
import com.highschoolhowto.content.tag.TagResponse;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PageLayoutService {

    private static final int HOME_SECTION_MAX_CARDS = 6;

    private final ContentCardRepository cardRepository;
    private final TagRepository tagRepository;

    public PageLayoutService(ContentCardRepository cardRepository, TagRepository tagRepository) {
        this.cardRepository = cardRepository;
        this.tagRepository = tagRepository;
    }

    @Transactional(readOnly = true)
    public HomeLayoutResponse getHomeLayout() {
        List<HomeLayoutResponse.SectionResponse> sections = tagRepository
                .findTagsWithCardStatus(CardStatus.PUBLISHED)
                .stream()
                .sorted(Comparator.comparing(Tag::getName))
                .map(tag -> {
                    List<ContentCardResponse> cards = cardRepository
                            .findByTagSlugAndStatus(tag.getSlug(), CardStatus.PUBLISHED)
                            .stream()
                            .limit(HOME_SECTION_MAX_CARDS)
                            .map(ContentCardResponse::from)
                            .toList();
                    return new HomeLayoutResponse.SectionResponse(
                            TagResponse.from(tag),
                            tag.getName(),
                            cards);
                })
                .toList();

        return new HomeLayoutResponse(sections);
    }
}
