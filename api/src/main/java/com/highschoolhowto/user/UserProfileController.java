package com.highschoolhowto.user;

import com.highschoolhowto.auth.AuthService;
import com.highschoolhowto.user.dto.UpdatePasswordRequest;
import com.highschoolhowto.user.dto.UpdateProfileRequest;
import com.highschoolhowto.user.dto.UserProfileResponse;
import com.highschoolhowto.security.UserPrincipal;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users/me")
public class UserProfileController {

    private final AuthService authService;

    public UserProfileController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping
    public ResponseEntity<UserProfileResponse> me(@AuthenticationPrincipal UserPrincipal principal) {
        UUID userId = principal.getUser().getId();
        return ResponseEntity.ok(authService.getProfile(userId));
    }

    @PutMapping
    public ResponseEntity<UserProfileResponse> update(
            @AuthenticationPrincipal UserPrincipal principal, @Valid @RequestBody UpdateProfileRequest request) {
        UUID userId = principal.getUser().getId();
        return ResponseEntity.ok(authService.updateProfile(userId, request));
    }

    @PutMapping("/password")
    public ResponseEntity<Void> updatePassword(
            @AuthenticationPrincipal UserPrincipal principal, @Valid @RequestBody UpdatePasswordRequest request) {
        UUID userId = principal.getUser().getId();
        authService.updatePassword(userId, request);
        return ResponseEntity.noContent().build();
    }
}
