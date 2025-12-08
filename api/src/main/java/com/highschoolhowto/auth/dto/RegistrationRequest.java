package com.highschoolhowto.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegistrationRequest(
        @Email @NotBlank String email,
        @NotBlank @Size(min = 12) String password,
        @NotBlank String firstName,
        @NotBlank String lastName) {}
