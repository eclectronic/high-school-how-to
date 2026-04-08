package com.highschoolhowto.bookmark;

import com.highschoolhowto.bookmark.dto.BookmarkListResponse;
import com.highschoolhowto.bookmark.dto.BookmarkMetadataResponse;
import com.highschoolhowto.bookmark.dto.BookmarkResponse;
import com.highschoolhowto.bookmark.dto.CreateBookmarkListRequest;
import com.highschoolhowto.bookmark.dto.CreateBookmarkListResponse;
import com.highschoolhowto.bookmark.dto.CreateBookmarkRequest;
import com.highschoolhowto.bookmark.dto.ReorderBookmarksRequest;
import com.highschoolhowto.bookmark.dto.UpdateBookmarkListRequest;
import com.highschoolhowto.bookmark.dto.UpdateBookmarkRequest;
import com.highschoolhowto.security.UserPrincipal;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class BookmarkController {

    private final BookmarkListService bookmarkListService;
    private final BookmarkMetadataService metadataService;

    public BookmarkController(BookmarkListService bookmarkListService, BookmarkMetadataService metadataService) {
        this.bookmarkListService = bookmarkListService;
        this.metadataService = metadataService;
    }

    // ── Bookmark Lists ──────────────────────────────────────────────────────

    @GetMapping("/api/bookmarklists")
    public ResponseEntity<List<BookmarkListResponse>> getLists(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(bookmarkListService.getLists(principal.getUser().getId()));
    }

    @PostMapping("/api/bookmarklists")
    public ResponseEntity<CreateBookmarkListResponse> createList(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateBookmarkListRequest request) {
        return ResponseEntity.ok(bookmarkListService.createList(principal.getUser().getId(), request));
    }

    @PutMapping("/api/bookmarklists/{listId}")
    public ResponseEntity<BookmarkListResponse> updateList(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID listId,
            @Valid @RequestBody UpdateBookmarkListRequest request) {
        return ResponseEntity.ok(bookmarkListService.updateList(principal.getUser().getId(), listId, request));
    }

    @DeleteMapping("/api/bookmarklists/{listId}")
    public ResponseEntity<Void> deleteList(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID listId) {
        bookmarkListService.deleteList(principal.getUser().getId(), listId);
        return ResponseEntity.noContent().build();
    }

    // ── Bookmarks within a list ─────────────────────────────────────────────

    @PostMapping("/api/bookmarklists/{listId}/bookmarks")
    public ResponseEntity<BookmarkResponse> addBookmark(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID listId,
            @Valid @RequestBody CreateBookmarkRequest request) {
        return ResponseEntity.ok(bookmarkListService.addBookmark(principal.getUser().getId(), listId, request));
    }

    @PutMapping("/api/bookmarklists/{listId}/bookmarks/{bookmarkId}")
    public ResponseEntity<BookmarkResponse> updateBookmark(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID listId,
            @PathVariable UUID bookmarkId,
            @Valid @RequestBody UpdateBookmarkRequest request) {
        return ResponseEntity.ok(bookmarkListService.updateBookmark(principal.getUser().getId(), listId, bookmarkId, request));
    }

    @PutMapping("/api/bookmarklists/{listId}/bookmarks/reorder")
    public ResponseEntity<Void> reorderBookmarks(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID listId,
            @Valid @RequestBody ReorderBookmarksRequest request) {
        bookmarkListService.reorderBookmarks(principal.getUser().getId(), listId, request);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/api/bookmarklists/{listId}/bookmarks/{bookmarkId}")
    public ResponseEntity<Void> deleteBookmark(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID listId,
            @PathVariable UUID bookmarkId) {
        bookmarkListService.deleteBookmark(principal.getUser().getId(), listId, bookmarkId);
        return ResponseEntity.noContent().build();
    }

    // ── Metadata proxy ──────────────────────────────────────────────────────

    @GetMapping("/api/bookmarks/metadata")
    public ResponseEntity<BookmarkMetadataResponse> getMetadata(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam String url) {
        return ResponseEntity.ok(metadataService.fetch(url));
    }
}
