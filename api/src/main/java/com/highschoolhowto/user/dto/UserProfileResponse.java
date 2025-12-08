package com.highschoolhowto.user.dto;

import java.time.Instant;

public record UserProfileResponse(
        String id,
        String email,
        String firstName,
        String lastName,
        String gradeLevel,
        String bio,
        String interests,
        Instant updatedAt) {}
