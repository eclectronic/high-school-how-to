package com.highschoolhowto.homelayout;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.highschoolhowto.homelayout.dto.HomeSectionRequest;
import com.highschoolhowto.homelayout.dto.HomeSectionResponse;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class HomeLayoutControllerTest {

    @Mock
    HomeSectionService service;

    @InjectMocks
    HomeLayoutController controller;

    @Test
    void getPublic_returnsLayout() {
        var section = new HomeSectionResponse(1L, 1, "split", "home-how-to", "home-locker");
        when(service.list()).thenReturn(List.of(section));

        List<HomeSectionResponse> result = controller.getPublic();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).layout()).isEqualTo("split");
        assertThat(result.get(0).slot1Tag()).isEqualTo("home-how-to");
    }

    @Test
    void getAdmin_delegatesToService() {
        var section = new HomeSectionResponse(1L, 1, "full", "home-video", null);
        when(service.list()).thenReturn(List.of(section));

        List<HomeSectionResponse> result = controller.getAdmin();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).layout()).isEqualTo("full");
        // @PreAuthorize("hasRole('ADMIN')") enforced by Spring Security at runtime
    }

    @Test
    void save_delegatesToService() {
        var request = new HomeSectionRequest("split", "home-how-to", "home-locker");
        var saved = new HomeSectionResponse(1L, 1, "split", "home-how-to", "home-locker");
        when(service.save(List.of(request))).thenReturn(List.of(saved));

        List<HomeSectionResponse> result = controller.save(List.of(request));

        assertThat(result).hasSize(1);
        assertThat(result.get(0).slot2Tag()).isEqualTo("home-locker");
        // @PreAuthorize("hasRole('ADMIN')") enforced by Spring Security at runtime
    }
}
