package com.highschoolhowto.social;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.highschoolhowto.social.dto.AdminSocialLinkResponse;
import com.highschoolhowto.social.dto.SocialLinkResponse;
import com.highschoolhowto.social.dto.SocialLinkUpdateRequest;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SocialLinksControllerTest {

    @Mock
    SocialLinkService service;

    @InjectMocks
    SocialLinksController controller;

    @Test
    void listPublic_delegatesToService() {
        var response = new SocialLinkResponse(1L, "INSTAGRAM", "Instagram", "https://www.instagram.com/highschoolhowto", 1);
        when(service.listPublic()).thenReturn(List.of(response));

        List<SocialLinkResponse> result = controller.listPublic();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).platform()).isEqualTo("INSTAGRAM");
    }

    @Test
    void listPublic_returnsEmptyWhenNoEnabledLinks() {
        when(service.listPublic()).thenReturn(List.of());

        assertThat(controller.listPublic()).isEmpty();
    }

    @Test
    void listAdmin_delegatesToService() {
        var response = new AdminSocialLinkResponse(3L, "TIKTOK", "TikTok", null, 3, true);
        when(service.listAdmin()).thenReturn(List.of(response));

        List<AdminSocialLinkResponse> result = controller.listAdmin();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).platform()).isEqualTo("TIKTOK");
        assertThat(result.get(0).url()).isNull();
    }

    @Test
    void update_delegatesToService() {
        var request = new SocialLinkUpdateRequest("https://tiktok.com/foo", true, 3);
        var response = new AdminSocialLinkResponse(3L, "TIKTOK", "TikTok", "https://tiktok.com/foo", 3, true);
        when(service.update(3L, request)).thenReturn(response);

        AdminSocialLinkResponse result = controller.update(3L, request);

        assertThat(result.url()).isEqualTo("https://tiktok.com/foo");
    }
}
