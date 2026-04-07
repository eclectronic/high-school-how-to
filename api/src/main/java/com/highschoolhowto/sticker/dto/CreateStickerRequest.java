package com.highschoolhowto.sticker.dto;

import jakarta.validation.constraints.Size;

public record CreateStickerRequest(
        @Size(max = 16) String emoji,
        double positionX,
        double positionY,
        @Size(max = 16) String size
) {}
