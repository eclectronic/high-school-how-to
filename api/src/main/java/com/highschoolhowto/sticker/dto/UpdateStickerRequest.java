package com.highschoolhowto.sticker.dto;

import jakarta.validation.constraints.Size;

public record UpdateStickerRequest(
        double positionX,
        double positionY,
        @Size(max = 16) String size
) {}
