package com.highschoolhowto.content.tag;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SaveTagRequest(
        @NotBlank @Size(max = 255) String name,
        @NotBlank @Size(max = 255) @Pattern(regexp = "^[a-z0-9-]+$", message = "slug must be lowercase alphanumeric with hyphens") String slug,
        String description,
        int sortOrder) {}
