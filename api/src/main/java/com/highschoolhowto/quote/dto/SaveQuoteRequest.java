package com.highschoolhowto.quote.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SaveQuoteRequest(
        @NotBlank String quoteText,
        @Size(max = 255) String attribution
) {}
