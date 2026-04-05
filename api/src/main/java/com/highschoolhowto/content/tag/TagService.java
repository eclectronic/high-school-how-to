package com.highschoolhowto.content.tag;

import com.highschoolhowto.content.card.CardStatus;
import com.highschoolhowto.content.card.ContentCardRepository;
import com.highschoolhowto.web.ApiException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TagService {

    private final TagRepository tagRepository;
    private final ContentCardRepository contentCardRepository;

    public TagService(TagRepository tagRepository, ContentCardRepository contentCardRepository) {
        this.tagRepository = tagRepository;
        this.contentCardRepository = contentCardRepository;
    }

    @Transactional(readOnly = true)
    public List<Tag> findAll() {
        return tagRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Tag> findWithPublishedCards() {
        return tagRepository.findTagsWithCardStatus(CardStatus.PUBLISHED);
    }

    @Transactional(readOnly = true)
    public Tag findById(Long id) {
        return tagRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Tag not found", "No tag with id " + id));
    }

    @Transactional(readOnly = true)
    public Tag findBySlug(String slug) {
        return tagRepository.findBySlug(slug)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Tag not found", "No tag with slug: " + slug));
    }

    @Transactional
    public Tag create(SaveTagRequest request) {
        if (tagRepository.existsBySlug(request.slug())) {
            throw new ApiException(HttpStatus.CONFLICT, "Slug already in use", "A tag with slug '" + request.slug() + "' already exists");
        }
        Tag tag = new Tag();
        tag.setSlug(request.slug());
        tag.setName(request.name());
        tag.setDescription(request.description());
        tag.setSortOrder(request.sortOrder());
        return tagRepository.save(tag);
    }

    @Transactional
    public Tag update(Long id, SaveTagRequest request) {
        Tag tag = findById(id);
        if (!tag.getSlug().equals(request.slug()) && tagRepository.existsBySlug(request.slug())) {
            throw new ApiException(HttpStatus.CONFLICT, "Slug already in use", "A tag with slug '" + request.slug() + "' already exists");
        }
        tag.setSlug(request.slug());
        tag.setName(request.name());
        tag.setDescription(request.description());
        tag.setSortOrder(request.sortOrder());
        return tagRepository.save(tag);
    }

    @Transactional
    public void delete(Long id) {
        Tag tag = findById(id);
        List<String> orphanedCardTitles = contentCardRepository.findCardTitlesWithOnlyTag(id);
        if (!orphanedCardTitles.isEmpty()) {
            String cardList = String.join(", ", orphanedCardTitles);
            throw new ApiException(HttpStatus.CONFLICT, "Tag in use",
                    "Cannot delete — " + orphanedCardTitles.size() + " card(s) would have no tags: " + cardList + ". Reassign them first.");
        }
        tagRepository.delete(tag);
    }
}
