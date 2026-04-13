package com.highschoolhowto.locker.preferences;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.highschoolhowto.locker.preferences.dto.AppPreferencesResponse;
import com.highschoolhowto.locker.preferences.dto.UpdateAppPreferencesRequest;
import com.highschoolhowto.web.ApiException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class AppPreferencesServiceTest {

    @Mock
    UserAppPreferencesRepository preferencesRepository;

    @Spy
    ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    AppPreferencesService service;

    // --- getPreferences ---

    @Test
    void getPreferences_createsDefaultsWhenNoneExist() {
        UUID userId = UUID.randomUUID();
        when(preferencesRepository.findByUserId(userId)).thenReturn(Optional.empty());
        when(preferencesRepository.save(any(UserAppPreferences.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        AppPreferencesResponse response = service.getPreferences(userId);

        assertThat(response.activeApps()).containsExactly("TODO", "NOTES", "TIMER");
        assertThat(response.paletteName()).isEqualTo("ocean");
        assertThat(response.paneOrder()).isNull();
        assertThat(response.lockerColor()).isNull();
        assertThat(response.fontFamily()).isNull();
        verify(preferencesRepository).save(any(UserAppPreferences.class));
    }

    @Test
    void getPreferences_returnsExistingPreferences() throws Exception {
        UUID userId = UUID.randomUUID();
        UserAppPreferences existing = new UserAppPreferences();
        existing.setUserId(userId);
        existing.setActiveApps(new ObjectMapper().writeValueAsString(List.of("TODO", "NOTES")));
        existing.setPaletteName("sunset");
        existing.setPaneOrder(null);

        when(preferencesRepository.findByUserId(userId)).thenReturn(Optional.of(existing));

        AppPreferencesResponse response = service.getPreferences(userId);

        assertThat(response.activeApps()).containsExactly("TODO", "NOTES");
        assertThat(response.paletteName()).isEqualTo("sunset");
        assertThat(response.paneOrder()).isNull();
        verify(preferencesRepository, never()).save(any());
    }

    // --- updatePreferences ---

    @Test
    void updatePreferences_savesValidRequest() throws Exception {
        UUID userId = UUID.randomUUID();
        UserAppPreferences existing = new UserAppPreferences();
        existing.setUserId(userId);
        existing.setActiveApps(new ObjectMapper().writeValueAsString(List.of("TODO", "NOTES", "TIMER")));
        existing.setPaletteName("ocean");

        when(preferencesRepository.findByUserId(userId)).thenReturn(Optional.of(existing));
        when(preferencesRepository.save(any(UserAppPreferences.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        UpdateAppPreferencesRequest request = new UpdateAppPreferencesRequest(
                List.of("TODO", "NOTES"), null, "forest", "#a0c8f0", null);

        AppPreferencesResponse response = service.updatePreferences(userId, request);

        assertThat(response.activeApps()).containsExactly("TODO", "NOTES");
        assertThat(response.paletteName()).isEqualTo("forest");
        assertThat(response.lockerColor()).isEqualTo("#a0c8f0");
        verify(preferencesRepository).save(any(UserAppPreferences.class));
    }

    @Test
    void updatePreferences_acceptsSingleApp() throws Exception {
        UUID userId = UUID.randomUUID();
        UserAppPreferences existing = new UserAppPreferences();
        existing.setUserId(userId);
        existing.setActiveApps(new ObjectMapper().writeValueAsString(List.of("TODO", "NOTES", "TIMER")));
        existing.setPaletteName("ocean");

        when(preferencesRepository.findByUserId(userId)).thenReturn(Optional.of(existing));
        when(preferencesRepository.save(any(UserAppPreferences.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        // 1 app is valid — min is 1
        UpdateAppPreferencesRequest request = new UpdateAppPreferencesRequest(
                List.of("TIMER"), null, "ocean", null, null);

        AppPreferencesResponse response = service.updatePreferences(userId, request);

        assertThat(response.activeApps()).containsExactly("TIMER");
        verify(preferencesRepository).save(any(UserAppPreferences.class));
    }

    @Test
    void updatePreferences_rejectsInvalidAppIdentifier() {
        UUID userId = UUID.randomUUID();
        UpdateAppPreferencesRequest request = new UpdateAppPreferencesRequest(
                List.of("TODO", "INVALID"), null, "ocean", null, null);

        assertThatThrownBy(() -> service.updatePreferences(userId, request))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus())
                        .isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY));

        verify(preferencesRepository, never()).save(any());
    }

    @Test
    void updatePreferences_rejectsDuplicateApps() {
        UUID userId = UUID.randomUUID();
        UpdateAppPreferencesRequest request = new UpdateAppPreferencesRequest(
                List.of("TODO", "TODO"), null, "ocean", null, null);

        assertThatThrownBy(() -> service.updatePreferences(userId, request))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus())
                        .isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY));

        verify(preferencesRepository, never()).save(any());
    }
}
