package com.highschoolhowto.auth.token;

import com.highschoolhowto.config.JwtProperties;
import com.highschoolhowto.user.User;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RefreshTokenService {

    private final RefreshTokenRepository repository;
    private final JwtProperties properties;

    public RefreshTokenService(RefreshTokenRepository repository, JwtProperties properties) {
        this.repository = repository;
        this.properties = properties;
    }

    @Transactional
    public RefreshToken issue(User user) {
        RefreshToken token = new RefreshToken();
        token.setUser(user);
        token.setToken(UUID.randomUUID().toString());
        token.setExpiresAt(Instant.now().plus(properties.getRefreshTokenTtl()));
        token.setRevoked(false);
        return repository.save(token);
    }

    @Transactional
    public void revokeAllActive(User user) {
        List<RefreshToken> tokens = repository.findByUserAndRevokedFalseAndExpiresAtAfter(user, Instant.now());
        tokens.forEach(token -> token.setRevoked(true));
        repository.saveAll(tokens);
    }
}
