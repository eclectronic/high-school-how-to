package com.highschoolhowto.sticker.dto;

import jakarta.validation.constraints.Size;

public record UpdateStickerRequest(
        @Size(max = 10) String emoji,
        @Size(max = 2000) String iconUrl,
        @Size(max = 255) String label
) {}
