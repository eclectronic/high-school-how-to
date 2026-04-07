package com.highschoolhowto.bookmark.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateBookmarkRequest(@NotBlank @Size(max = 2048) String url, @NotBlank @Size(max = 255) String title, @Size(max = 512) String faviconUrl) {}
