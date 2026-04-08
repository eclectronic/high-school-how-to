package com.highschoolhowto.content.card;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

public record SaveCardRequest(
        @NotBlank @Size(max = 500) String title,
        @NotBlank @Size(max = 255) @Pattern(regexp = "^[a-z0-9-]+$", message = "slug must be lowercase alphanumeric with hyphens") String slug,
        String description,
        @NotNull CardType cardType,
        String mediaUrl,
        String printMediaUrl,
        String thumbnailUrl,
        String coverImageUrl,
        String bodyJson,
        String bodyHtml,
        @Pattern(regexp = "^#[0-9a-fA-F]{3,8}$|^$", message = "backgroundColor must be a valid hex color") String backgroundColor,
        @Pattern(regexp = "^#[0-9a-fA-F]{3,8}$|^$", message = "textColor must be a valid hex color") String textColor,
        boolean simpleLayout,
        @NotNull CardStatus status,
        @NotEmpty(message = "At least one tag is required") List<Long> tagIds,
        @Valid List<ContentCardTaskRequest> templateTasks) {}
