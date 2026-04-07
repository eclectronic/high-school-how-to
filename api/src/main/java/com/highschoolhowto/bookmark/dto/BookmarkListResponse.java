package com.highschoolhowto.bookmark.dto;

import java.util.List;
import java.util.UUID;

public record BookmarkListResponse(UUID id, String title, String color, String textColor, List<BookmarkResponse> bookmarks) {}
