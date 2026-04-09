package com.highschoolhowto.bookmark.dto;

import com.highschoolhowto.badge.dto.EarnedBadgeResponse;
import java.util.List;
import java.util.UUID;

/**
 * Response for creating a bookmark list. Includes the created list and
 * an optional earnedBadge if this creation triggered a badge award.
 */
public record CreateBookmarkListResponse(
        UUID id,
        String title,
        String color,
        String textColor,
        List<BookmarkResponse> bookmarks,
        EarnedBadgeResponse earnedBadge) {}
