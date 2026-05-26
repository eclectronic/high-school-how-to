package com.highschoolhowto.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

// Length/complexity is enforced by PasswordPolicyValidator (single source of truth).
public record RegistrationRequest(
        @Email @NotBlank String email,
        @NotBlank String password,
        @NotBlank String firstName,
        @NotBlank String lastName) {}
