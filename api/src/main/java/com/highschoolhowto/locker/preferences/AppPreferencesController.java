package com.highschoolhowto.locker.preferences;

import com.highschoolhowto.locker.preferences.dto.AppPreferencesResponse;
import com.highschoolhowto.locker.preferences.dto.UpdateAppPreferencesRequest;
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
@RequestMapping("/api/locker/app-preferences")
public class AppPreferencesController {

    private final AppPreferencesService appPreferencesService;

    public AppPreferencesController(AppPreferencesService appPreferencesService) {
        this.appPreferencesService = appPreferencesService;
    }

    @GetMapping
    public ResponseEntity<AppPreferencesResponse> getPreferences(
            @AuthenticationPrincipal UserPrincipal principal) {
        UUID userId = principal.getUser().getId();
        return ResponseEntity.ok(appPreferencesService.getPreferences(userId));
    }

    @PutMapping
    public ResponseEntity<AppPreferencesResponse> updatePreferences(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UpdateAppPreferencesRequest request) {
        UUID userId = principal.getUser().getId();
        return ResponseEntity.ok(appPreferencesService.updatePreferences(userId, request));
    }
}
