package com.highschoolhowto.auth.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record AuthenticationResponse(
        String accessToken,
        String refreshToken,
        long expiresIn,
        String avatarUrl,
        String firstName) {}
