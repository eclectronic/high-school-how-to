package com.highschoolhowto.bookmark;

import com.highschoolhowto.badge.BadgeService;
import com.highschoolhowto.badge.BadgeTriggerType;
import com.highschoolhowto.bookmark.dto.BookmarkListResponse;
import com.highschoolhowto.bookmark.dto.BookmarkResponse;
import com.highschoolhowto.bookmark.dto.CreateBookmarkListRequest;
import com.highschoolhowto.bookmark.dto.CreateBookmarkListResponse;
import com.highschoolhowto.bookmark.dto.CreateBookmarkRequest;
import com.highschoolhowto.bookmark.dto.ReorderBookmarksRequest;
import com.highschoolhowto.bookmark.dto.UpdateBookmarkListRequest;
import com.highschoolhowto.bookmark.dto.UpdateBookmarkRequest;
import com.highschoolhowto.user.User;
import com.highschoolhowto.user.UserRepository;
import com.highschoolhowto.web.ApiException;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class BookmarkListService {

    static final int MAX_LISTS_PER_USER = 10;
    static final int MAX_BOOKMARKS_PER_LIST = 50;

    private final BookmarkListRepository bookmarkListRepository;
    private final BookmarkRepository bookmarkRepository;
    private final UserRepository userRepository;
    private final BadgeService badgeService;

    public BookmarkListService(
            BookmarkListRepository bookmarkListRepository,
            BookmarkRepository bookmarkRepository,
            UserRepository userRepository,
            BadgeService badgeService) {
        this.bookmarkListRepository = bookmarkListRepository;
        this.bookmarkRepository = bookmarkRepository;
        this.userRepository = userRepository;
        this.badgeService = badgeService;
    }

    @Transactional(readOnly = true)
    public List<BookmarkListResponse> getLists(UUID userId) {
        return bookmarkListRepository.findByUserIdOrderByCreatedAt(userId).stream()
                .map(this::toListResponse)
                .toList();
    }

    @Transactional
    public CreateBookmarkListResponse createList(UUID userId, CreateBookmarkListRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found", "User not found"));
        long count = bookmarkListRepository.countByUserId(userId);
        if (count >= MAX_LISTS_PER_USER) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Limit reached",
                    "Maximum of " + MAX_LISTS_PER_USER + " bookmark lists per user reached");
        }
        BookmarkList list = new BookmarkList();
        list.setUser(user);
        list.setTitle(request.title().trim());
        if (StringUtils.hasText(request.color())) {
            list.setColor(request.color().trim());
        }
        if (StringUtils.hasText(request.textColor())) {
            list.setTextColor(request.textColor().trim());
        }
        BookmarkList saved = bookmarkListRepository.save(list);
        var earnedBadge = badgeService.checkFeatureBadge(user, BadgeTriggerType.FIRST_SHORTCUT);
        return toCreateListResponse(saved, earnedBadge.orElse(null));
    }

    @Transactional
    public BookmarkListResponse updateList(UUID userId, UUID listId, UpdateBookmarkListRequest request) {
        BookmarkList list = requireList(listId, userId);
        list.setTitle(request.title().trim());
        list.setColor(StringUtils.hasText(request.color()) ? request.color().trim() : list.getColor());
        list.setTextColor(StringUtils.hasText(request.textColor()) ? request.textColor().trim() : null);
        return toListResponse(bookmarkListRepository.save(list));
    }

    @Transactional
    public void deleteList(UUID userId, UUID listId) {
        BookmarkList list = requireList(listId, userId);
        bookmarkListRepository.delete(list);
    }

    @Transactional
    public BookmarkResponse addBookmark(UUID userId, UUID listId, CreateBookmarkRequest request) {
        BookmarkList list = requireList(listId, userId);
        long count = bookmarkRepository.countByBookmarkListId(listId);
        if (count >= MAX_BOOKMARKS_PER_LIST) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Limit reached",
                    "Maximum of " + MAX_BOOKMARKS_PER_LIST + " bookmarks per list reached");
        }
        Bookmark bookmark = new Bookmark();
        bookmark.setBookmarkList(list);
        bookmark.setUrl(request.url());
        bookmark.setTitle(StringUtils.hasText(request.title()) ? request.title() : "");
        bookmark.setFaviconUrl(request.faviconUrl());
        bookmark.setSortOrder((int) count);
        return toBookmarkResponse(bookmarkRepository.save(bookmark));
    }

    @Transactional
    public BookmarkResponse updateBookmark(UUID userId, UUID listId, UUID bookmarkId, UpdateBookmarkRequest request) {
        requireList(listId, userId);
        Bookmark bookmark = requireBookmark(bookmarkId, listId);
        bookmark.setUrl(request.url());
        bookmark.setTitle(request.title());
        bookmark.setFaviconUrl(request.faviconUrl());
        return toBookmarkResponse(bookmarkRepository.save(bookmark));
    }

    @Transactional
    public void reorderBookmarks(UUID userId, UUID listId, ReorderBookmarksRequest request) {
        requireList(listId, userId);
        List<UUID> orderedIds = request.orderedIds();
        for (int i = 0; i < orderedIds.size(); i++) {
            Bookmark bookmark = requireBookmark(orderedIds.get(i), listId);
            bookmark.setSortOrder(i);
            bookmarkRepository.save(bookmark);
        }
    }

    @Transactional
    public void deleteBookmark(UUID userId, UUID listId, UUID bookmarkId) {
        requireList(listId, userId);
        Bookmark bookmark = requireBookmark(bookmarkId, listId);
        bookmarkRepository.delete(bookmark);
    }

    private BookmarkList requireList(UUID listId, UUID userId) {
        return bookmarkListRepository.findByIdAndUserId(listId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Bookmark list not found", "Bookmark list not found for this user"));
    }

    private Bookmark requireBookmark(UUID bookmarkId, UUID listId) {
        return bookmarkRepository.findByIdAndBookmarkListId(bookmarkId, listId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Bookmark not found", "Bookmark not found in this list"));
    }

    private BookmarkListResponse toListResponse(BookmarkList list) {
        List<BookmarkResponse> bookmarkResponses = list.getBookmarks().stream()
                .map(this::toBookmarkResponse)
                .toList();
        return new BookmarkListResponse(
                list.getId(),
                list.getTitle(),
                list.getColor(),
                list.getTextColor(),
                bookmarkResponses);
    }

    private CreateBookmarkListResponse toCreateListResponse(
            BookmarkList list, com.highschoolhowto.badge.dto.EarnedBadgeResponse earnedBadge) {
        List<BookmarkResponse> bookmarkResponses = list.getBookmarks().stream()
                .map(this::toBookmarkResponse)
                .toList();
        return new CreateBookmarkListResponse(
                list.getId(),
                list.getTitle(),
                list.getColor(),
                list.getTextColor(),
                bookmarkResponses,
                earnedBadge);
    }

    private BookmarkResponse toBookmarkResponse(Bookmark bm) {
        return new BookmarkResponse(
                bm.getId(),
                bm.getUrl(),
                bm.getTitle(),
                bm.getFaviconUrl(),
                bm.getSortOrder());
    }
}
