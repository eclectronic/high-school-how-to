package com.highschoolhowto.content.card;

import com.highschoolhowto.content.tag.Tag;
import com.highschoolhowto.content.tag.TagRepository;
import com.highschoolhowto.tasks.TaskItem;
import com.highschoolhowto.tasks.TaskList;
import com.highschoolhowto.tasks.TaskItemRepository;
import com.highschoolhowto.tasks.TaskListRepository;
import com.highschoolhowto.tasks.TaskListService;
import com.highschoolhowto.tasks.dto.TaskListResponse;
import com.highschoolhowto.user.User;
import com.highschoolhowto.user.UserRepository;
import com.highschoolhowto.web.ApiException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ContentCardService {

    static final int MAX_LINKS_PER_CARD = 10;
    static final int MAX_TEMPLATE_TASKS = 50;

    private final ContentCardRepository cardRepository;
    private final TagRepository tagRepository;
    private final HtmlSanitizerService htmlSanitizer;
    private final TaskListRepository taskListRepository;
    private final TaskItemRepository taskItemRepository;
    private final UserRepository userRepository;

    public ContentCardService(
            ContentCardRepository cardRepository,
            TagRepository tagRepository,
            HtmlSanitizerService htmlSanitizer,
            TaskListRepository taskListRepository,
            TaskItemRepository taskItemRepository,
            UserRepository userRepository) {
        this.cardRepository = cardRepository;
        this.tagRepository = tagRepository;
        this.htmlSanitizer = htmlSanitizer;
        this.taskListRepository = taskListRepository;
        this.taskItemRepository = taskItemRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<ContentCardSummary> searchCards(String query, Long excludeId) {
        return cardRepository.searchByTitle(query, excludeId).stream()
                .map(ContentCardSummary::from)
                .toList();
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

    @Transactional
    public TaskListResponse addToLocker(String slug, UUID userId) {
        ContentCard card = findPublishedBySlug(slug);
        if (card.getCardType() != CardType.TODO_LIST) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Not a to-do list", "This content card is not a TODO_LIST");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found", "User not found"));

        long count = taskListRepository.countByUserId(userId);
        if (count >= TaskListService.MAX_LISTS_PER_USER) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Limit reached",
                    "Maximum of " + TaskListService.MAX_LISTS_PER_USER + " lists per user reached");
        }

        TaskList list = new TaskList();
        list.setUser(user);
        list.setTitle(card.getTitle());
        list.setColor(card.getBackgroundColor() != null ? card.getBackgroundColor() : "#fffef8");
        list.setTextColor(card.getTextColor());
        list.setSourceContentCardId(card.getId());
        TaskList savedList = taskListRepository.save(list);

        List<TaskItem> items = new ArrayList<>();
        for (ContentCardTask templateTask : card.getTemplateTasks()) {
            TaskItem item = new TaskItem();
            item.setTaskList(savedList);
            item.setDescription(templateTask.getDescription());
            item.setSortOrder(templateTask.getSortOrder());
            item.setCompleted(false);
            items.add(item);
        }
        taskItemRepository.saveAll(items);

        return new TaskListResponse(savedList.getId(), savedList.getTitle(), savedList.getColor(), savedList.getTextColor(), List.of());
    }

    @Transactional(readOnly = true)
    public LockerStatusResponse getLockerStatus(String slug, UUID userId) {
        ContentCard card = findPublishedBySlug(slug);
        if (card.getCardType() != CardType.TODO_LIST) {
            return new LockerStatusResponse(false, null);
        }
        return taskListRepository
                .findFirstByUserIdAndSourceContentCardIdOrderByCreatedAtAsc(userId, card.getId())
                .map(list -> new LockerStatusResponse(true, list.getId()))
                .orElse(new LockerStatusResponse(false, null));
    }

    private void applyRequest(ContentCard card, SaveCardRequest request) {
        card.setSlug(request.slug());
        card.setTitle(request.title());
        card.setDescription(request.description());
        card.setCardType(request.cardType());
        card.setStatus(request.status());
        card.setThumbnailUrl(request.thumbnailUrl());
        card.setCoverImageUrl(request.coverImageUrl());
        card.setBackgroundColor(request.backgroundColor());
        card.setTextColor(request.textColor());
        card.setSimpleLayout(request.simpleLayout());

        if (request.cardType() != CardType.TODO_LIST) {
            card.setMediaUrl(request.mediaUrl());
            card.setPrintMediaUrl(request.printMediaUrl());
            card.setBodyJson(request.bodyJson());
            card.setBodyHtml(htmlSanitizer.sanitize(request.bodyHtml()));
        } else {
            card.setMediaUrl(null);
            card.setPrintMediaUrl(null);
            card.setBodyJson(null);
            card.setBodyHtml(null);
        }

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

        applyLinks(card, request.links());
        validateAndApplyTemplateTasks(card, request);
    }

    private void applyLinks(ContentCard card, List<ContentCardLinkRequest> linkRequests) {
        List<ContentCardLinkRequest> requests =
                (linkRequests == null) ? List.of() : linkRequests;

        if (requests.size() > MAX_LINKS_PER_CARD) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Too many links",
                    "A card may have at most " + MAX_LINKS_PER_CARD + " links");
        }

        // Self-link check (card.id may be null for new cards — checked after save)
        if (card.getId() != null) {
            boolean hasSelfLink =
                    requests.stream().anyMatch(r -> card.getId().equals(r.targetCardId()));
            if (hasSelfLink) {
                throw new ApiException(
                        HttpStatus.BAD_REQUEST, "Self-link not allowed", "A card cannot link to itself");
            }
        }

        // Duplicate target check
        Set<Long> seen = new HashSet<>();
        for (ContentCardLinkRequest req : requests) {
            if (!seen.add(req.targetCardId())) {
                throw new ApiException(
                        HttpStatus.BAD_REQUEST,
                        "Duplicate link",
                        "Target card " + req.targetCardId() + " appears more than once");
            }
        }

        // Resolve target cards
        List<Long> targetIds = requests.stream().map(ContentCardLinkRequest::targetCardId).toList();
        List<ContentCard> targets = cardRepository.findAllById(targetIds);
        if (targets.size() != targetIds.size()) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST, "Invalid link target", "One or more target card IDs not found");
        }

        Map<Long, ContentCard> targetMap = new HashMap<>();
        for (ContentCard t : targets) {
            targetMap.put(t.getId(), t);
        }

        // Replace all links (orphanRemoval handles deletion)
        card.getLinks().clear();
        List<ContentCardLink> newLinks = new ArrayList<>();
        for (ContentCardLinkRequest req : requests) {
            ContentCardLink link = new ContentCardLink();
            link.setSourceCard(card);
            link.setTargetCard(targetMap.get(req.targetCardId()));
            link.setLinkText(req.linkText());
            link.setSortOrder(req.sortOrder());
            newLinks.add(link);
        }
        card.getLinks().addAll(newLinks);
    }

    private void validateAndApplyTemplateTasks(ContentCard card, SaveCardRequest request) {
        List<ContentCardTaskRequest> incoming = request.templateTasks();
        if (card.getCardType() == CardType.TODO_LIST) {
            if (incoming == null || incoming.isEmpty()) {
                throw new ApiException(
                        HttpStatus.BAD_REQUEST,
                        "Template tasks required",
                        "TODO_LIST cards must have at least one template task");
            }
            if (incoming.size() > MAX_TEMPLATE_TASKS) {
                throw new ApiException(
                        HttpStatus.BAD_REQUEST,
                        "Too many tasks",
                        "Maximum of " + MAX_TEMPLATE_TASKS + " template tasks allowed");
            }
            card.getTemplateTasks().clear();
            for (int i = 0; i < incoming.size(); i++) {
                ContentCardTask task = new ContentCardTask();
                task.setCard(card);
                task.setDescription(incoming.get(i).description());
                task.setSortOrder(i);
                card.getTemplateTasks().add(task);
            }
        } else {
            card.getTemplateTasks().clear();
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
