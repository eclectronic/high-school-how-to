package com.highschoolhowto.content.card;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/content/cards")
public class ContentCardController {

    private final ContentCardService cardService;

    public ContentCardController(ContentCardService cardService) {
        this.cardService = cardService;
    }

    @GetMapping
    public List<ContentCardResponse> listPublished() {
        return cardService.findPublished().stream().map(ContentCardResponse::from).toList();
    }

    @GetMapping("/{slug}")
    public ContentCardResponse getBySlug(@PathVariable String slug) {
        return ContentCardResponse.from(cardService.findPublishedBySlug(slug));
    }
}
