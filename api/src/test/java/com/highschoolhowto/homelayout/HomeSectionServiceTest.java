package com.highschoolhowto.homelayout;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.highschoolhowto.homelayout.dto.HomeSectionRequest;
import com.highschoolhowto.homelayout.dto.HomeSectionResponse;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class HomeSectionServiceTest {

    @Mock
    HomeSectionRepository repo;

    @InjectMocks
    HomeSectionService service;

    @Test
    void list_returnsSectionsInOrder() {
        HomeSection s1 = makeSection(1L, 1, "split", "home-how-to", "home-locker");
        HomeSection s2 = makeSection(2L, 2, "full", "home-video", null);
        when(repo.findAllByOrderBySortOrderAsc()).thenReturn(List.of(s1, s2));

        List<HomeSectionResponse> result = service.list();

        assertThat(result).hasSize(2);
        assertThat(result.get(0).sortOrder()).isEqualTo(1);
        assertThat(result.get(0).layout()).isEqualTo("split");
        assertThat(result.get(1).sortOrder()).isEqualTo(2);
        assertThat(result.get(1).layout()).isEqualTo("full");
    }

    @Test
    void save_replacesAllSections() {
        HomeSection saved1 = makeSection(10L, 1, "split", "home-how-to", "home-locker");
        HomeSection saved2 = makeSection(11L, 2, "full", "home-video", null);
        when(repo.saveAll(anyList())).thenReturn(List.of(saved1, saved2));

        List<HomeSectionRequest> requests = List.of(
                new HomeSectionRequest("split", "home-how-to", "home-locker"),
                new HomeSectionRequest("full", "home-video", null)
        );

        List<HomeSectionResponse> result = service.save(requests);

        verify(repo).deleteAll();
        verify(repo).saveAll(anyList());
        assertThat(result).hasSize(2);
        assertThat(result.get(0).slot1Tag()).isEqualTo("home-how-to");
        assertThat(result.get(1).slot1Tag()).isEqualTo("home-video");
    }

    @Test
    void save_assignsSortOrderByIndex() {
        HomeSection saved1 = makeSection(1L, 1, "full", "home-how-to", null);
        HomeSection saved2 = makeSection(2L, 2, "full", "home-video", null);
        when(repo.saveAll(anyList())).thenReturn(List.of(saved1, saved2));

        List<HomeSectionRequest> requests = List.of(
                new HomeSectionRequest("full", "home-how-to", null),
                new HomeSectionRequest("full", "home-video", null)
        );

        service.save(requests);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<HomeSection>> captor = ArgumentCaptor.forClass(List.class);
        verify(repo).saveAll(captor.capture());
        List<HomeSection> saved = captor.getValue();
        assertThat(saved.get(0).getSortOrder()).isEqualTo(1);
        assertThat(saved.get(1).getSortOrder()).isEqualTo(2);
    }

    private HomeSection makeSection(Long id, int sortOrder, String layout, String slot1Tag, String slot2Tag) {
        HomeSection s = new HomeSection();
        s.setSortOrder(sortOrder);
        s.setLayout(layout);
        s.setSlot1Tag(slot1Tag);
        s.setSlot2Tag(slot2Tag);
        try {
            var f = HomeSection.class.getDeclaredField("id");
            f.setAccessible(true);
            f.set(s, id);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return s;
    }
}
