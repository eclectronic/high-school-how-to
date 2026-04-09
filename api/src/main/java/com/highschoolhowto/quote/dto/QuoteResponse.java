package com.highschoolhowto.quote.dto;

public record QuoteResponse(
        Long id,
        String quoteText,
        String attribution
) {}
