package com.highschoolhowto.content.card;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ContentCardLinkRequest(
        @NotNull Long targetCardId,
        @Size(max = 500) String linkText,
        int sortOrder) {}
