package com.highschoolhowto.locker.dto;

import java.util.UUID;

public record LockerLayoutItemResponse(String cardType, UUID cardId, int sortOrder) {}
