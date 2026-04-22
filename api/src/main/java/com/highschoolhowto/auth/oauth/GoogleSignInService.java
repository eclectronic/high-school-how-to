package com.highschoolhowto.auth.oauth;

import com.highschoolhowto.audit.AuditEventType;
import com.highschoolhowto.audit.AuditService;
import com.highschoolhowto.auth.dto.AuthenticationResponse;
import com.highschoolhowto.auth.jwt.JwtService;
import com.highschoolhowto.auth.token.RefreshToken;
import com.highschoolhowto.auth.token.RefreshTokenService;
import com.highschoolhowto.config.JwtProperties;
import com.highschoolhowto.shortcut.ShortcutService;
import com.highschoolhowto.user.User;
import com.highschoolhowto.user.UserRepository;
import com.highschoolhowto.user.UserStatus;
import java.time.Instant;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GoogleSignInService {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final JwtProperties jwtProperties;
    private final RefreshTokenService refreshTokenService;
    private final AuditService auditService;
    private final ShortcutService shortcutService;

    public GoogleSignInService(
            UserRepository userRepository,
            JwtService jwtService,
            JwtProperties jwtProperties,
            RefreshTokenService refreshTokenService,
            AuditService auditService,
            ShortcutService shortcutService) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.jwtProperties = jwtProperties;
        this.refreshTokenService = refreshTokenService;
        this.auditService = auditService;
        this.shortcutService = shortcutService;
    }

    @Transactional
    public AuthenticationResponse signIn(GoogleIdTokenPayload payload, boolean rememberMe) {
        String normalizedEmail = payload.email().toLowerCase(Locale.US);
        boolean isNew = false;

        // 1. Look up by Google sub
        User user = userRepository.findByGoogleId(payload.sub()).orElse(null);

        if (user == null) {
            // 2. Look up by email
            User byEmail = userRepository.findByEmailIgnoreCase(normalizedEmail).orElse(null);

            if (byEmail != null) {
                if (byEmail.getEmailVerifiedAt() == null) {
                    // Dangling unverified registration — delete it, create fresh Google account
                    userRepository.delete(byEmail);
                    userRepository.flush();
                    user = createGoogleUser(payload, normalizedEmail);
                    isNew = true;
                } else {
                    // Verified password user — link Google
                    byEmail.setGoogleId(payload.sub());
                    if (byEmail.getAvatarUrl() == null) {
                        byEmail.setAvatarUrl(payload.picture());
                    }
                    if (byEmail.getFirstName() == null) {
                        byEmail.setFirstName(payload.firstName());
                    }
                    if (byEmail.getLastName() == null) {
                        byEmail.setLastName(payload.lastName());
                    }
                    user = userRepository.save(byEmail);
                }
            } else {
                // Brand-new user
                user = createGoogleUser(payload, normalizedEmail);
                isNew = true;
            }
        } else {
            // Known Google user — refresh profile fields from Google on every sign-in
            boolean changed = false;
            if (payload.picture() != null && !payload.picture().equals(user.getAvatarUrl())) {
                user.setAvatarUrl(payload.picture());
                changed = true;
            }
            if (payload.firstName() != null && user.getFirstName() == null) {
                user.setFirstName(payload.firstName());
                changed = true;
            }
            if (payload.lastName() != null && user.getLastName() == null) {
                user.setLastName(payload.lastName());
                changed = true;
            }
            if (changed) {
                user = userRepository.save(user);
            }
        }

        if (isNew) {
            shortcutService.seedDefaultGoogleShortcuts(user);
        }

        String accessToken = jwtService.generateAccessToken(user);
        long expiresIn = jwtProperties.getAccessTokenTtl().toSeconds();

        AuditEventType eventType = isNew ? AuditEventType.GOOGLE_SIGN_IN_NEW_USER : AuditEventType.GOOGLE_SIGN_IN;
        auditService.record(eventType, user, user.getEmail(), null);

        if (rememberMe) {
            RefreshToken refreshToken = refreshTokenService.issue(user, true);
            return new AuthenticationResponse(accessToken, refreshToken.getToken(), expiresIn, user.getAvatarUrl(), user.getFirstName());
        }
        return new AuthenticationResponse(accessToken, null, expiresIn, user.getAvatarUrl(), user.getFirstName());
    }

    private User createGoogleUser(GoogleIdTokenPayload payload, String normalizedEmail) {
        User user = new User();
        user.setEmail(normalizedEmail);
        user.setGoogleId(payload.sub());
        user.setFirstName(payload.firstName());
        user.setLastName(payload.lastName());
        user.setAvatarUrl(payload.picture());
        user.setStatus(UserStatus.ACTIVE);
        user.setEmailVerifiedAt(Instant.now());
        return userRepository.save(user);
    }
}
