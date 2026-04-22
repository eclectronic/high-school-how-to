package com.highschoolhowto.auth.oauth;

public record GoogleIdTokenPayload(
        String sub,
        String email,
        String firstName,
        String lastName,
        String picture) {}
