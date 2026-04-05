package com.highschoolhowto.auth.jwt;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public record JwtPayload(
        UUID subject,
        TokenScope scope,
        Optional<UUID> jwtId,
        Instant issuedAt,
        Instant expiresAt,
        Optional<String> email,
        Optional<String> role) {}
