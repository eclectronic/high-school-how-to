package com.highschoolhowto.auth.dto;

import jakarta.validation.constraints.NotBlank;

// Length/complexity is enforced by PasswordPolicyValidator (single source of truth).
public record ResetPasswordRequest(
        @NotBlank String token,
        @NotBlank String newPassword) {}