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
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordPolicyValidator passwordPolicyValidator;
    private final JwtService jwtService;
    private final JwtProperties jwtProperties;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final RefreshTokenService refreshTokenService;
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
        RefreshToken refreshToken = refreshTokenService.issue(user);
        auditService.record(AuditEventType.LOGIN_SUCCESS, user, user.getEmail(), null);
        long expiresIn = jwtProperties.getAccessTokenTtl().toSeconds();
        return new AuthenticationResponse(accessToken, refreshToken.getToken(), expiresIn);
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
    public void forgotPassword(ForgotPasswordRequest request) {
        userRepository
                .findByEmailIgnoreCase(request.email().toLowerCase(Locale.US))
                .filter(user -> user.getStatus() == UserStatus.ACTIVE)
                .ifPresent(user -> {
                    PasswordResetToken token = new PasswordResetToken();
                    token.setUser(user);
                    token.setExpiresAt(Instant.now().plus(jwtProperties.getResetTokenTtl()));
                    passwordResetTokenRepository.save(token);
                    String jwt = jwtService.generatePasswordResetToken(user.getId(), token.getId());
                    String link = appendToken(linkProperties.getReset(), jwt);
                    notificationService.sendPasswordResetEmail(user, link);
                    auditService.record(AuditEventType.PASSWORD_RESET_REQUESTED, user, user.getEmail(), null);
                });
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
