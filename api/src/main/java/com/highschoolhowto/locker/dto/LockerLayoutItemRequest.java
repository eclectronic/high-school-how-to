package com.highschoolhowto.locker.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record LockerLayoutItemRequest(@NotBlank String cardType, @NotNull UUID cardId, int sortOrder) {}
