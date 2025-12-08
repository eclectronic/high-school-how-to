package com.highschoolhowto.auth;

import com.highschoolhowto.auth.dto.AuthenticationResponse;
import com.highschoolhowto.auth.dto.ForgotPasswordRequest;
import com.highschoolhowto.auth.dto.LoginRequest;
import com.highschoolhowto.auth.dto.RegistrationRequest;
import com.highschoolhowto.auth.dto.ResetPasswordRequest;
import com.highschoolhowto.auth.dto.VerificationResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthenticationResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/register")
    public ResponseEntity<Void> register(@Valid @RequestBody RegistrationRequest request) {
        authService.register(request);
        return ResponseEntity.accepted().build();
    }

    @GetMapping(value = "/verify-email", produces = {MediaType.APPLICATION_JSON_VALUE, MediaType.TEXT_HTML_VALUE})
    public ResponseEntity<?> verifyEmail(@RequestParam("token") String token, HttpServletRequest request) {
        authService.verifyEmail(token);
        String message = "Thanks! If your link was valid your email is now verified.";
        String accept = request.getHeader(HttpHeaders.ACCEPT);
        if (accept != null && accept.contains(MediaType.TEXT_HTML_VALUE)) {
            String html = """
                    <html>
                      <body>
                        <p>%s</p>
                      </body>
                    </html>
                    """
                    .formatted(message);
            return ResponseEntity.ok()
                    .contentType(MediaType.TEXT_HTML)
                    .body(html);
        }
        return ResponseEntity.ok(new VerificationResponse(message));
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
}
