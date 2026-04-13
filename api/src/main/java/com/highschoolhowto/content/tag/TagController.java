package com.highschoolhowto.content.tag;

import com.highschoolhowto.content.card.CardStatus;
import com.highschoolhowto.content.card.ContentCardResponse;
import com.highschoolhowto.content.card.ContentCardService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tags")
public class TagController {

    private final TagService tagService;
    private final ContentCardService cardService;

    public TagController(TagService tagService, ContentCardService cardService) {
        this.tagService = tagService;
        this.cardService = cardService;
    }

    @GetMapping
    public List<TagResponse> listAll() {
        return tagService.findWithPublishedCards().stream()
                .sorted(java.util.Comparator.comparing(Tag::getName))
                .map(TagResponse::from)
                .toList();
    }

    @GetMapping("/{slug}/cards")
    public List<ContentCardResponse> cardsByTag(@PathVariable String slug) {
        return cardService.findByTagSlug(slug, true);
    }
}
