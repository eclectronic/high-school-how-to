package com.highschoolhowto.auth.oauth;

import jakarta.validation.constraints.NotBlank;

public record GoogleSignInRequest(
        @NotBlank String idToken,
        @NotBlank String nonce,
        boolean rememberMe) {}
