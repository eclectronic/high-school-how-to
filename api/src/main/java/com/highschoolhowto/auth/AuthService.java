package com.highschoolhowto.auth;

import com.highschoolhowto.audit.AuditEventType;
import com.highschoolhowto.audit.AuditService;
import com.highschoolhowto.auth.dto.AuthenticationResponse;
import com.highschoolhowto.auth.dto.ForgotPasswordRequest;
import com.highschoolhowto.auth.dto.LoginRequest;
import com.highschoolhowto.auth.dto.RegistrationRequest;
import com.highschoolhowto.auth.dto.ResetPasswordRequest;
import com.highschoolhowto.auth.jwt.JwtService;
import com.highschoolhowto.auth.jwt.JwtValidationException;
import com.highschoolhowto.auth.jwt.TokenScope;
import com.highschoolhowto.auth.token.EmailVerificationToken;
import com.highschoolhowto.auth.token.EmailVerificationTokenRepository;
import com.highschoolhowto.auth.token.PasswordResetToken;
import com.highschoolhowto.auth.token.PasswordResetTokenRepository;
import com.highschoolhowto.auth.token.RefreshToken;
import com.highschoolhowto.auth.token.RefreshTokenService;
import com.highschoolhowto.auth.token.RefreshTokenRepository;
import com.highschoolhowto.config.AuthLinkProperties;
import com.highschoolhowto.config.JwtProperties;
import com.highschoolhowto.notification.NotificationService;
import com.highschoolhowto.user.User;
import com.highschoolhowto.user.UserMapper;
import com.highschoolhowto.user.UserRepository;
import com.highschoolhowto.user.UserStatus;
import com.highschoolhowto.user.dto.UpdatePasswordRequest;
import com.highschoolhowto.user.dto.UpdateProfileRequest;
import com.highschoolhowto.user.dto.UserProfileResponse;
import com.highschoolhowto.web.ApiException;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordPolicyValidator passwordPolicyValidator;
    private final JwtService jwtService;
    private final JwtProperties jwtProperties;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final RefreshTokenService refreshTokenService;
    private final RefreshTokenRepository refreshTokenRepository;
    private final AuditService auditService;
    private final NotificationService notificationService;
    private final AuthLinkProperties linkProperties;
    private final UserMapper userMapper;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            PasswordPolicyValidator passwordPolicyValidator,
            JwtService jwtService,
            JwtProperties jwtProperties,
            EmailVerificationTokenRepository emailVerificationTokenRepository,
            PasswordResetTokenRepository passwordResetTokenRepository,
            RefreshTokenService refreshTokenService,
            RefreshTokenRepository refreshTokenRepository,
            AuditService auditService,
            NotificationService notificationService,
            AuthLinkProperties linkProperties,
            UserMapper userMapper) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.passwordPolicyValidator = passwordPolicyValidator;
        this.jwtService = jwtService;
        this.jwtProperties = jwtProperties;
        this.emailVerificationTokenRepository = emailVerificationTokenRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.refreshTokenService = refreshTokenService;
        this.refreshTokenRepository = refreshTokenRepository;
        this.auditService = auditService;
        this.notificationService = notificationService;
        this.linkProperties = linkProperties;
        this.userMapper = userMapper;
    }

    @Transactional
    public AuthenticationResponse login(LoginRequest request) {
        String normalizedEmail = request.email().toLowerCase(Locale.US);
        User user = userRepository
                .findByEmailIgnoreCase(normalizedEmail)
                .orElseThrow(() -> unauthorized("Invalid credentials"));
        if (user.getStatus() != UserStatus.ACTIVE || user.getEmailVerifiedAt() == null) {
            throw unauthorized("Account not verified");
        }
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            auditService.record(AuditEventType.LOGIN_FAILURE, user, user.getEmail(), "invalid-password");
            throw unauthorized("Invalid credentials");
        }
        String accessToken = jwtService.generateAccessToken(user);
        long expiresIn = jwtProperties.getAccessTokenTtl().toSeconds();
        auditService.record(AuditEventType.LOGIN_SUCCESS, user, user.getEmail(), null);
        if (request.rememberMe()) {
            RefreshToken refreshToken = refreshTokenService.issue(user, true);
            return new AuthenticationResponse(accessToken, refreshToken.getToken(), expiresIn, user.getAvatarUrl(), user.getFirstName());
        }
        return new AuthenticationResponse(accessToken, null, expiresIn, user.getAvatarUrl(), user.getFirstName());
    }

    @Transactional
    public void register(RegistrationRequest request) {
        String normalizedEmail = request.email().toLowerCase(Locale.US);
        userRepository
                .findByEmailIgnoreCase(normalizedEmail)
                .ifPresent(existing -> {
                    throw new ApiException(HttpStatus.CONFLICT, "Email already registered", "Email already registered");
                });
        validatePassword(request.password());
        User user = new User();
        user.setEmail(normalizedEmail);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setStatus(UserStatus.PENDING_VERIFICATION);
        userRepository.save(user);

        EmailVerificationToken token = new EmailVerificationToken();
        token.setUser(user);
        token.setExpiresAt(Instant.now().plus(jwtProperties.getVerificationTokenTtl()));
        emailVerificationTokenRepository.save(token);

        String jwt = jwtService.generateVerificationToken(user.getId(), token.getId());
        String link = appendToken(linkProperties.getVerification(), jwt);
        notificationService.sendVerificationEmail(user, link);
        auditService.record(AuditEventType.REGISTRATION_SUBMITTED, user, user.getEmail(), null);
        auditService.record(AuditEventType.EMAIL_VERIFICATION_TRIGGERED, user, user.getEmail(), null);
    }

    @Transactional
    public boolean verifyEmail(String token) {
        try {
            var payload = jwtService.parseAndValidate(token, TokenScope.VERIFY_EMAIL);
            UUID tokenId = payload.jwtId().orElseThrow(() -> new JwtValidationException("Missing token id"));
            EmailVerificationToken stored = emailVerificationTokenRepository
                    .findById(tokenId)
                    .orElse(null);
            if (stored == null) {
                return false;
            }
            if (stored.getConsumedAt() != null || stored.getExpiresAt().isBefore(Instant.now())) {
                return false;
            }
            User user = stored.getUser();
            user.setStatus(UserStatus.ACTIVE);
            user.setEmailVerifiedAt(Instant.now());
            stored.setConsumedAt(Instant.now());
            userRepository.save(user);
            emailVerificationTokenRepository.save(stored);
            auditService.record(AuditEventType.EMAIL_VERIFICATION_COMPLETED, user, user.getEmail(), null);
            return true;
        } catch (JwtValidationException ex) {
            return false;
        }
    }

    @Transactional
    public void resendVerification(ForgotPasswordRequest request) {
        userRepository
                .findByEmailIgnoreCase(request.email().toLowerCase(Locale.US))
                .ifPresentOrElse(user -> {
                    if (user.getStatus() != UserStatus.PENDING_VERIFICATION) {
                        log.info("Resend verification skipped for user {} (status={})", user.getEmail(), user.getStatus());
                        return;
                    }
                    EmailVerificationToken token = new EmailVerificationToken();
                    token.setUser(user);
                    token.setExpiresAt(Instant.now().plus(jwtProperties.getVerificationTokenTtl()));
                    emailVerificationTokenRepository.save(token);
                    String jwt = jwtService.generateVerificationToken(user.getId(), token.getId());
                    String link = appendToken(linkProperties.getVerification(), jwt);
                    notificationService.sendVerificationEmail(user, link);
                    auditService.record(AuditEventType.EMAIL_VERIFICATION_TRIGGERED, user, user.getEmail(), "resend");
                    log.info("Verification email resent for {}", user.getEmail());
                }, () -> log.info("Resend verification requested for unknown email {}", request.email().toLowerCase(Locale.US)));
    }

    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        userRepository
                .findByEmailIgnoreCase(request.email().toLowerCase(Locale.US))
                .ifPresentOrElse(user -> {
                    if (user.getStatus() != UserStatus.ACTIVE) {
                        log.info("Password reset skipped for inactive user {}", user.getEmail());
                        return;
                    }
                    PasswordResetToken token = new PasswordResetToken();
                    token.setUser(user);
                    token.setExpiresAt(Instant.now().plus(jwtProperties.getResetTokenTtl()));
                    passwordResetTokenRepository.save(token);
                    String jwt = jwtService.generatePasswordResetToken(user.getId(), token.getId());
                    String link = appendToken(linkProperties.getReset(), jwt);
                    notificationService.sendPasswordResetEmail(user, link);
                    auditService.record(AuditEventType.PASSWORD_RESET_REQUESTED, user, user.getEmail(), null);
                    log.info("Password reset email dispatched for {}", user.getEmail());
                }, () -> log.info("Password reset requested for unknown email {}", request.email().toLowerCase(Locale.US)));
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        validatePassword(request.newPassword());
        var payload = jwtService.parseAndValidate(request.token(), TokenScope.RESET_PASSWORD);
        UUID tokenId = payload.jwtId().orElseThrow(() -> new JwtValidationException("Missing token id"));
        PasswordResetToken token = passwordResetTokenRepository
                .findById(tokenId)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Invalid token", "Reset token invalid"));
        if (token.getConsumedAt() != null || token.getExpiresAt().isBefore(Instant.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid token", "Reset token expired or used");
        }
        User user = token.getUser();
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        token.setConsumedAt(Instant.now());
        userRepository.save(user);
        passwordResetTokenRepository.save(token);
        refreshTokenService.revokeAllActive(user);
        auditService.record(AuditEventType.PASSWORD_RESET_COMPLETED, user, user.getEmail(), null);
    }

    @Transactional
    public void logout(UUID userId, String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return;
        }
        refreshTokenRepository.findByTokenAndRevokedFalse(refreshToken).ifPresent(token -> {
            if (token.getUser().getId().equals(userId)) {
                token.setRevoked(true);
                refreshTokenRepository.save(token);
                auditService.record(AuditEventType.LOGOUT, token.getUser(), token.getUser().getEmail(), null);
            }
        });
    }

    @Transactional
    public void updatePassword(UUID userId, UpdatePasswordRequest request) {
        validatePassword(request.newPassword());
        User user = userRepository
                .findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found", "User not found"));
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Current password incorrect", "Current password incorrect");
        }
        if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST, "New password must differ", "New password must differ from current password");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        refreshTokenService.revokeAllActive(user);
        auditService.record(AuditEventType.PASSWORD_CHANGED, user, user.getEmail(), null);
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(UUID userId) {
        User user = userRepository
                .findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found", "User not found"));
        return userMapper.toResponse(user);
    }

    @Transactional
    public UserProfileResponse updateProfile(UUID userId, UpdateProfileRequest request) {
        User user = userRepository
                .findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found", "User not found"));
        if (request.firstName() != null) {
            user.setFirstName(request.firstName());
        }
        if (request.lastName() != null) {
            user.setLastName(request.lastName());
        }
        if (request.gradeLevel() != null) {
            user.setGradeLevel(request.gradeLevel());
        }
        if (request.bio() != null) {
            user.setBio(request.bio());
        }
        if (request.interests() != null) {
            user.setInterests(request.interests());
        }
        User saved = userRepository.save(user);
        return userMapper.toResponse(saved);
    }

    @Transactional
    public AuthenticationResponse refresh(String refreshToken) {
        // Check if token exists at all (revoked or not) for theft detection
        RefreshToken anyToken = refreshTokenRepository.findByToken(refreshToken).orElse(null);
        if (anyToken != null && anyToken.isRevoked()) {
            // Revoked token reuse = likely theft — blow out all sessions
            refreshTokenService.revokeAllActive(anyToken.getUser());
            throw unauthorized("Refresh token reuse detected");
        }
        RefreshToken token = refreshTokenRepository
                .findByTokenAndRevokedFalse(refreshToken)
                .orElseThrow(() -> unauthorized("Invalid refresh token"));
        if (token.getExpiresAt().isBefore(Instant.now())) {
            token.setRevoked(true);
            refreshTokenRepository.save(token);
            throw unauthorized("Refresh token expired");
        }
        User user = token.getUser();
        if (user.getStatus() != UserStatus.ACTIVE || user.getEmailVerifiedAt() == null) {
            token.setRevoked(true);
            refreshTokenRepository.save(token);
            throw unauthorized("User inactive");
        }
        boolean wasRememberMe = token.isRememberMe();
        token.setRevoked(true);
        refreshTokenRepository.save(token);

        String accessToken = jwtService.generateAccessToken(user);
        long expiresIn = jwtProperties.getAccessTokenTtl().toSeconds();
        auditService.record(AuditEventType.LOGIN_SUCCESS, user, user.getEmail(), "refresh");
        RefreshToken newRefresh = refreshTokenService.issue(user, wasRememberMe);
        return new AuthenticationResponse(accessToken, newRefresh.getToken(), expiresIn, user.getAvatarUrl(), user.getFirstName());
    }

    private void validatePassword(String password) {
        List<String> violations = passwordPolicyValidator.validate(password);
        if (!violations.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Password does not meet requirements", String.join(" ", violations));
        }
    }

    private ApiException unauthorized(String detail) {
        return new ApiException(HttpStatus.UNAUTHORIZED, "Unauthorized", detail);
    }

    private String appendToken(String baseUrl, String token) {
        String delimiter = baseUrl.contains("?") ? "&" : "?";
        return baseUrl + delimiter + "token=" + token;
    }
}
