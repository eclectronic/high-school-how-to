package com.highschoolhowto.homelayout.dto;

public record HomeSectionResponse(
        Long id,
        int sortOrder,
        String layout,
        String slot1Tag,
        String slot2Tag
) {}
