package com.highschoolhowto.bookmark.dto;

import java.util.List;
import java.util.UUID;

public record ReorderBookmarksRequest(List<UUID> orderedIds) {}
