package com.highschoolhowto.social;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.highschoolhowto.social.dto.AdminSocialLinkResponse;
import com.highschoolhowto.social.dto.SocialLinkResponse;
import com.highschoolhowto.social.dto.SocialLinkUpdateRequest;
import com.highschoolhowto.web.ApiException;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SocialLinkServiceTest {

    @Mock
    SocialLinkRepository repository;

    @InjectMocks
    SocialLinkService service;

    private SocialLink instagram;
    private SocialLink youtube;
    private SocialLink tiktok;

    @BeforeEach
    void setUp() {
        instagram = makeLink(1L, "INSTAGRAM", "Instagram", "https://www.instagram.com/highschoolhowto", 1, true);
        youtube = makeLink(2L, "YOUTUBE", "YouTube", "https://www.youtube.com/@HighSchool-HowTo", 2, true);
        tiktok = makeLink(3L, "TIKTOK", "TikTok", null, 3, true);
    }

    @Test
    void listPublic_returnsOnlyEnabledLinksWithNonNullUrl() {
        when(repository.findByEnabledTrueAndUrlIsNotNullOrderByDisplayOrderAsc())
                .thenReturn(List.of(instagram, youtube));

        List<SocialLinkResponse> result = service.listPublic();

        assertThat(result).hasSize(2);
        assertThat(result.get(0).platform()).isEqualTo("INSTAGRAM");
        assertThat(result.get(1).platform()).isEqualTo("YOUTUBE");
    }

    @Test
    void listPublic_excludesUrlNullPlatforms() {
        when(repository.findByEnabledTrueAndUrlIsNotNullOrderByDisplayOrderAsc())
                .thenReturn(List.of(instagram, youtube));

        List<SocialLinkResponse> result = service.listPublic();

        assertThat(result).noneMatch(r -> r.platform().equals("TIKTOK"));
    }

    @Test
    void listAdmin_returnsAllLinks() {
        when(repository.findAllByOrderByDisplayOrderAsc())
                .thenReturn(List.of(instagram, youtube, tiktok));

        List<AdminSocialLinkResponse> result = service.listAdmin();

        assertThat(result).hasSize(3);
    }

    @Test
    void update_setsUrlAndEnabled() {
        when(repository.findById(1L)).thenReturn(Optional.of(instagram));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AdminSocialLinkResponse result = service.update(1L, new SocialLinkUpdateRequest("https://new.url", true, 1));

        assertThat(result.url()).isEqualTo("https://new.url");
        assertThat(result.enabled()).isTrue();
    }

    @Test
    void update_setsNullWhenBlankUrl() {
        when(repository.findById(1L)).thenReturn(Optional.of(instagram));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AdminSocialLinkResponse result = service.update(1L, new SocialLinkUpdateRequest("", true, 1));

        assertThat(result.url()).isNull();
    }

    @Test
    void update_throwsNotFoundForMissingId() {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update(99L, new SocialLinkUpdateRequest(null, false, 0)))
                .isInstanceOf(ApiException.class);
    }

    private SocialLink makeLink(Long id, String platform, String displayName, String url, int order, boolean enabled) {
        SocialLink link = new SocialLink();
        link.setPlatform(platform);
        link.setDisplayName(displayName);
        link.setUrl(url);
        link.setDisplayOrder(order);
        link.setEnabled(enabled);
        // Set id via reflection since there's no setter
        try {
            var f = SocialLink.class.getDeclaredField("id");
            f.setAccessible(true);
            f.set(link, id);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return link;
    }
}
