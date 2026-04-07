package com.highschoolhowto.bookmark.dto;

import java.util.UUID;

public record BookmarkResponse(UUID id, String url, String title, String faviconUrl, int sortOrder) {}
