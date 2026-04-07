package com.highschoolhowto.locker.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record SaveLockerLayoutRequest(@NotNull @Valid List<LockerLayoutItemRequest> items) {}
