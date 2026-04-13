package com.highschoolhowto.locker.preferences;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.highschoolhowto.locker.preferences.dto.AppPreferencesResponse;
import com.highschoolhowto.locker.preferences.dto.UpdateAppPreferencesRequest;
import com.highschoolhowto.web.ApiException;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AppPreferencesService {

    private static final List<String> DEFAULT_ACTIVE_APPS = List.of("TODO", "NOTES", "TIMER");
    private static final String DEFAULT_PALETTE_NAME = "ocean";
    private static final Set<String> VALID_APP_IDS = Set.of("TODO", "NOTES", "TIMER", "SHORTCUTS");

    private final UserAppPreferencesRepository preferencesRepository;
    private final ObjectMapper objectMapper;

    public AppPreferencesService(
            UserAppPreferencesRepository preferencesRepository, ObjectMapper objectMapper) {
        this.preferencesRepository = preferencesRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public AppPreferencesResponse getPreferences(UUID userId) {
        UserAppPreferences prefs = preferencesRepository
                .findByUserId(userId)
                .orElseGet(() -> createDefaults(userId));
        return toResponse(prefs);
    }

    @Transactional
    public AppPreferencesResponse updatePreferences(UUID userId, UpdateAppPreferencesRequest request) {
        validateActiveApps(request.activeApps());

        UserAppPreferences prefs = preferencesRepository
                .findByUserId(userId)
                .orElseGet(() -> createDefaults(userId));

        prefs.setActiveApps(toJson(request.activeApps()));
        prefs.setPaneOrder(request.paneOrder() != null ? toJson(request.paneOrder()) : null);
        prefs.setPaletteName(request.paletteName().trim());
        prefs.setLockerColor(request.lockerColor() != null ? request.lockerColor().trim() : null);
        prefs.setFontFamily(request.fontFamily() != null ? request.fontFamily().trim() : null);

        UserAppPreferences saved = preferencesRepository.save(prefs);
        return toResponse(saved);
    }

    private UserAppPreferences createDefaults(UUID userId) {
        UserAppPreferences prefs = new UserAppPreferences();
        prefs.setUserId(userId);
        prefs.setActiveApps(toJson(DEFAULT_ACTIVE_APPS));
        prefs.setPaneOrder(null);
        prefs.setPaletteName(DEFAULT_PALETTE_NAME);
        return preferencesRepository.save(prefs);
    }

    private void validateActiveApps(List<String> activeApps) {
        for (String app : activeApps) {
            if (!VALID_APP_IDS.contains(app)) {
                throw new ApiException(
                        HttpStatus.UNPROCESSABLE_ENTITY,
                        "Invalid app identifier",
                        "'" + app + "' is not a valid app identifier. Must be one of: " + VALID_APP_IDS);
            }
        }
        Set<String> seen = new HashSet<>();
        for (String app : activeApps) {
            if (!seen.add(app)) {
                throw new ApiException(
                        HttpStatus.UNPROCESSABLE_ENTITY,
                        "Duplicate app identifier",
                        "Duplicate app identifier: '" + app + "'");
            }
        }
    }

    private AppPreferencesResponse toResponse(UserAppPreferences prefs) {
        List<String> activeApps = parseList(prefs.getActiveApps());
        List<String> paneOrder = prefs.getPaneOrder() != null ? parseList(prefs.getPaneOrder()) : null;
        return new AppPreferencesResponse(activeApps, paneOrder, prefs.getPaletteName(), prefs.getLockerColor(), prefs.getFontFamily());
    }

    private List<String> parseList(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            throw new ApiException(
                    HttpStatus.INTERNAL_SERVER_ERROR, "Preference parse error", "Failed to parse stored preferences");
        }
    }

    private String toJson(List<String> list) {
        try {
            return objectMapper.writeValueAsString(list);
        } catch (Exception e) {
            throw new ApiException(
                    HttpStatus.INTERNAL_SERVER_ERROR, "Preference serialize error", "Failed to serialize preferences");
        }
    }
}
