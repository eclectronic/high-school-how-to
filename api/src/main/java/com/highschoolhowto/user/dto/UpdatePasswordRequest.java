package com.highschoolhowto.user.dto;

import jakarta.validation.constraints.NotBlank;

// Length/complexity is enforced by PasswordPolicyValidator (single source of truth).
public record UpdatePasswordRequest(
        @NotBlank String currentPassword,
        @NotBlank String newPassword) {}