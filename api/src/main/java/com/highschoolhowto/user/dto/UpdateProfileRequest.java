package com.highschoolhowto.user.dto;

import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @Size(max = 100) String firstName,
        @Size(max = 100) String lastName,
        @Size(max = 50) String gradeLevel,
        @Size(max = 2000) String bio,
        @Size(max = 2000) String interests) {}
