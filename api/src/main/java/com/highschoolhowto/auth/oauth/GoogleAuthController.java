package com.highschoolhowto.auth.oauth;

import com.highschoolhowto.auth.dto.AuthenticationResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class GoogleAuthController {

    private final GoogleIdTokenVerifier verifier;
    private final GoogleSignInService googleSignInService;

    public GoogleAuthController(GoogleIdTokenVerifier verifier, GoogleSignInService googleSignInService) {
        this.verifier = verifier;
        this.googleSignInService = googleSignInService;
    }

    @PostMapping("/google")
    public ResponseEntity<AuthenticationResponse> googleSignIn(@Valid @RequestBody GoogleSignInRequest request) {
        GoogleIdTokenPayload payload = verifier.verify(request.idToken(), request.nonce());
        AuthenticationResponse response = googleSignInService.signIn(payload, request.rememberMe());
        return ResponseEntity.ok(response);
    }
}
