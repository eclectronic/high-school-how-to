package com.highschoolhowto.content.card;

import com.highschoolhowto.content.tag.Tag;
import com.highschoolhowto.content.tag.TagRepository;
import com.highschoolhowto.web.ApiException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ContentCardService {

    private final ContentCardRepository cardRepository;
    private final TagRepository tagRepository;
    private final HtmlSanitizerService htmlSanitizer;

    public ContentCardService(
            ContentCardRepository cardRepository,
            TagRepository tagRepository,
            HtmlSanitizerService htmlSanitizer) {
        this.cardRepository = cardRepository;
        this.tagRepository = tagRepository;
        this.htmlSanitizer = htmlSanitizer;
    }

    @Transactional(readOnly = true)
    public List<ContentCard> findAll() {
        return cardRepository.findAllWithTags();
    }

    @Transactional(readOnly = true)
    public List<ContentCard> findPublished() {
        return cardRepository.findByStatus(CardStatus.PUBLISHED);
    }

    @Transactional(readOnly = true)
    public List<ContentCard> findByTagSlug(String tagSlug, boolean publishedOnly) {
        if (publishedOnly) {
            return cardRepository.findByTagSlugAndStatus(tagSlug, CardStatus.PUBLISHED);
        }
        return cardRepository.findByTagSlug(tagSlug);
    }

    @Transactional(readOnly = true)
    public ContentCard findBySlug(String slug) {
        return cardRepository.findBySlug(slug)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Card not found", "No card with slug: " + slug));
    }

    @Transactional(readOnly = true)
    public ContentCard findPublishedBySlug(String slug) {
        ContentCard card = findBySlug(slug);
        if (card.getStatus() != CardStatus.PUBLISHED) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Card not found", "No card with slug: " + slug);
        }
        return card;
    }

    @Transactional(readOnly = true)
    public ContentCard findById(Long id) {
        return cardRepository.findByIdWithTags(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Card not found", "No card with id " + id));
    }

    @Transactional
    public ContentCard create(SaveCardRequest request) {
        if (cardRepository.existsBySlug(request.slug())) {
            throw new ApiException(HttpStatus.CONFLICT, "Slug already in use", "A card with slug '" + request.slug() + "' already exists");
        }
        ContentCard card = new ContentCard();
        applyRequest(card, request);
        return cardRepository.save(card);
    }

    @Transactional
    public ContentCard update(Long id, SaveCardRequest request) {
        ContentCard card = findById(id);
        if (!card.getSlug().equals(request.slug()) && cardRepository.existsBySlug(request.slug())) {
            throw new ApiException(HttpStatus.CONFLICT, "Slug already in use", "A card with slug '" + request.slug() + "' already exists");
        }
        applyRequest(card, request);
        return cardRepository.save(card);
    }

    @Transactional
    public void delete(Long id) {
        ContentCard card = findById(id);
        cardRepository.delete(card);
    }

    private void applyRequest(ContentCard card, SaveCardRequest request) {
        card.setSlug(request.slug());
        card.setTitle(request.title());
        card.setDescription(request.description());
        card.setCardType(request.cardType());
        card.setStatus(request.status());
        card.setMediaUrl(request.mediaUrl());
        card.setPrintMediaUrl(request.printMediaUrl());
        card.setThumbnailUrl(request.thumbnailUrl());
        card.setCoverImageUrl(request.coverImageUrl());
        card.setBodyJson(request.bodyJson());
        card.setBodyHtml(htmlSanitizer.sanitize(request.bodyHtml()));
        card.setBackgroundColor(request.backgroundColor());
        card.setTextColor(request.textColor());
        card.setSimpleLayout(request.simpleLayout());

        List<Tag> tags = tagRepository.findAllById(request.tagIds());
        if (tags.size() != request.tagIds().size()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid tags", "One or more tag IDs not found");
        }
        card.setTags(tags);

        // Auto-populate thumbnail from YouTube if VIDEO and no thumbnail set
        if (card.getCardType() == CardType.VIDEO
                && (card.getThumbnailUrl() == null || card.getThumbnailUrl().isBlank())
                && card.getMediaUrl() != null) {
            card.setThumbnailUrl(deriveYoutubeThumbnail(card.getMediaUrl()));
        }
    }

    private String deriveYoutubeThumbnail(String youtubeUrl) {
        try {
            String videoId = null;
            if (youtubeUrl.contains("youtu.be/")) {
                videoId = youtubeUrl.substring(youtubeUrl.lastIndexOf('/') + 1).split("\\?")[0];
            } else if (youtubeUrl.contains("v=")) {
                videoId = youtubeUrl.substring(youtubeUrl.indexOf("v=") + 2).split("&")[0];
            }
            if (videoId != null && !videoId.isBlank()) {
                return "https://img.youtube.com/vi/" + videoId + "/hqdefault.jpg";
            }
        } catch (Exception ignored) {
        }
        return null;
    }
}
