package com.highschoolhowto.locker.dto;

import java.util.UUID;

public record LockerLayoutItemResponse(
        String cardType,
        UUID cardId,
        int col,
        int colSpan,
        int order,
        boolean minimized,
        Integer posX,
        Integer posY,
        Integer minHeight,
        Integer width,
        Integer height) {}
