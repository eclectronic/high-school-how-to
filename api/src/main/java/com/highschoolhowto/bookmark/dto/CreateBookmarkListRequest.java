package com.highschoolhowto.bookmark.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateBookmarkListRequest(@NotBlank @Size(max = 150) String title, String color, String textColor) {}
