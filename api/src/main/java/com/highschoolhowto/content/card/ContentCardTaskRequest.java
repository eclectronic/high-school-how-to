package com.highschoolhowto.content.card;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ContentCardTaskRequest(
        @NotBlank @Size(max = 2000) String description) {}
