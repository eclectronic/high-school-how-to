package com.highschoolhowto.auth;

import com.highschoolhowto.auth.dto.AuthenticationResponse;
import com.highschoolhowto.auth.dto.ForgotPasswordRequest;
import com.highschoolhowto.auth.dto.LoginRequest;
import com.highschoolhowto.auth.dto.LogoutRequest;
import com.highschoolhowto.auth.dto.RegistrationRequest;
import com.highschoolhowto.auth.dto.ResetPasswordRequest;
import com.highschoolhowto.auth.dto.RefreshRequest;
import com.highschoolhowto.auth.dto.VerificationResponse;
import com.highschoolhowto.config.AuthLinkProperties;
import com.highschoolhowto.security.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.net.URI;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final AuthLinkProperties linkProperties;

    public AuthController(AuthService authService, AuthLinkProperties linkProperties) {
        this.authService = authService;
        this.linkProperties = linkProperties;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthenticationResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthenticationResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        return ResponseEntity.ok(authService.refresh(request.refreshToken()));
    }

    @PostMapping("/register")
    public ResponseEntity<Void> register(@Valid @RequestBody RegistrationRequest request) {
        authService.register(request);
        return ResponseEntity.accepted().build();
    }

    @GetMapping(value = "/verify-email", produces = {MediaType.APPLICATION_JSON_VALUE, MediaType.TEXT_HTML_VALUE})
    public ResponseEntity<?> verifyEmail(@RequestParam("token") String token, HttpServletRequest request) {
        boolean success = authService.verifyEmail(token);
        String message =
                success ? "Thanks! Your email is verified. You can log in now." : "Verification link invalid or expired.";
        String accept = request.getHeader(HttpHeaders.ACCEPT);
        if (accept != null && accept.contains(MediaType.TEXT_HTML_VALUE)) {
            String redirect = appendStatus(linkProperties.getVerificationRedirect(), success ? "success" : "error");
            return ResponseEntity.status(302).location(URI.create(redirect)).build();
        }
        return ResponseEntity.ok(new VerificationResponse(message));
    }

    private String appendStatus(String base, String status) {
        String sep = base.contains("?") ? "&" : "?";
        return base + sep + "verified=" + status;
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<Void> resendVerification(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.resendVerification(request);
        return ResponseEntity.accepted().build();
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ResponseEntity.accepted().build();
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody(required = false) LogoutRequest request) {
        String refreshToken = request != null ? request.refreshToken() : null;
        authService.logout(principal.getUser().getId(), refreshToken);
        return ResponseEntity.noContent().build();
    }
}
