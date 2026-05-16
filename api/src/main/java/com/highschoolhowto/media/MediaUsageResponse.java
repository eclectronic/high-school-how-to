package com.highschoolhowto.media;

import java.util.List;

public record MediaUsageResponse(int count, List<CardRef> cards) {
    public record CardRef(Long id, String slug, String title) {}
}
