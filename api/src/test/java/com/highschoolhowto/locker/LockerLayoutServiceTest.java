package com.highschoolhowto.locker;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.highschoolhowto.locker.dto.LockerLayoutItemRequest;
import com.highschoolhowto.locker.dto.LockerLayoutItemResponse;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class LockerLayoutServiceTest {

    @Mock
    LockerLayoutItemRepository repository;

    @InjectMocks
    LockerLayoutService service;

    @Test
    void getLayout_returnsItemsInItemOrder() {
        UUID userId = UUID.randomUUID();
        UUID cardA = UUID.randomUUID();
        UUID cardB = UUID.randomUUID();

        LockerLayoutItem itemA = item(userId, "TASK_LIST", cardA, 0, 0, 0, false, 320, 220);
        LockerLayoutItem itemB = item(userId, "TASK_LIST", cardB, 0, 100, 1, false, 320, 220);
        when(repository.findByUserIdOrderByItemOrder(userId)).thenReturn(List.of(itemA, itemB));

        List<LockerLayoutItemResponse> result = service.getLayout(userId);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).cardId()).isEqualTo(cardA);
        assertThat(result.get(1).cardId()).isEqualTo(cardB);
        assertThat(result.get(0).posX()).isEqualTo(0);
        assertThat(result.get(0).posY()).isEqualTo(0);
        assertThat(result.get(0).width()).isEqualTo(320);
        assertThat(result.get(0).height()).isEqualTo(220);
        assertThat(result.get(0).order()).isEqualTo(0);
        assertThat(result.get(0).minimized()).isFalse();
    }

    @Test
    void getLayout_returnsEmptyListWhenNoItems() {
        UUID userId = UUID.randomUUID();
        when(repository.findByUserIdOrderByItemOrder(userId)).thenReturn(List.of());

        List<LockerLayoutItemResponse> result = service.getLayout(userId);

        assertThat(result).isEmpty();
    }

    @Test
    void saveLayout_deletesExistingAndSavesNew() {
        UUID userId = UUID.randomUUID();
        UUID cardA = UUID.randomUUID();
        UUID cardB = UUID.randomUUID();

        List<LockerLayoutItemRequest> requests = List.of(
                req("TASK_LIST", cardA, 0, 0, 0, false, 320, 220),
                req("TASK_LIST", cardB, 0, 100, 1, false, 320, 220));

        LockerLayoutItem savedA = item(userId, "TASK_LIST", cardA, 0, 0, 0, false, 320, 220);
        LockerLayoutItem savedB = item(userId, "TASK_LIST", cardB, 0, 100, 1, false, 320, 220);
        when(repository.saveAll(anyList())).thenReturn(List.of(savedA, savedB));

        List<LockerLayoutItemResponse> result = service.saveLayout(userId, requests);

        verify(repository).deleteByUserId(userId);
        verify(repository).saveAll(any());
        assertThat(result).hasSize(2);
        assertThat(result.get(0).cardType()).isEqualTo("TASK_LIST");
    }

    @Test
    void saveLayout_replacesExistingLayout() {
        UUID userId = UUID.randomUUID();
        UUID cardA = UUID.randomUUID();

        when(repository.saveAll(anyList()))
                .thenReturn(List.of(item(userId, "TASK_LIST", cardA, 0, 0, 0, false, 320, 220)));

        service.saveLayout(userId, List.of(req("TASK_LIST", cardA, 0, 0, 0, false, 320, 220)));

        var inOrder = org.mockito.Mockito.inOrder(repository);
        inOrder.verify(repository).deleteByUserId(userId);
        inOrder.verify(repository).saveAll(any());
    }

    @Test
    void saveLayout_returnsItemsSortedByItemOrder() {
        UUID userId = UUID.randomUUID();
        UUID cardA = UUID.randomUUID();
        UUID cardB = UUID.randomUUID();

        // Return items out of order from saveAll to verify sorting
        LockerLayoutItem itemB = item(userId, "TASK_LIST", cardB, 0, 100, 1, false, 320, 220);
        LockerLayoutItem itemA = item(userId, "TASK_LIST", cardA, 0, 0, 0, false, 320, 220);
        when(repository.saveAll(anyList())).thenReturn(List.of(itemB, itemA));

        List<LockerLayoutItemResponse> result = service.saveLayout(userId, List.of(
                req("TASK_LIST", cardA, 0, 0, 0, false, 320, 220),
                req("TASK_LIST", cardB, 0, 100, 1, false, 320, 220)));

        assertThat(result.get(0).cardId()).isEqualTo(cardA);
        assertThat(result.get(1).cardId()).isEqualTo(cardB);
    }

    @Test
    void saveLayout_persistsMinimizedState() {
        UUID userId = UUID.randomUUID();
        UUID cardA = UUID.randomUUID();

        LockerLayoutItem saved = item(userId, "NOTE", cardA, 0, 0, 0, true, 320, 220);
        when(repository.saveAll(anyList())).thenReturn(List.of(saved));

        List<LockerLayoutItemResponse> result = service.saveLayout(
                userId, List.of(req("NOTE", cardA, 0, 0, 0, true, 320, 220)));

        assertThat(result.get(0).minimized()).isTrue();
    }

    @Test
    void saveLayout_persistsWidthAndHeight() {
        UUID userId = UUID.randomUUID();
        UUID cardA = UUID.randomUUID();

        LockerLayoutItem saved = item(userId, "TASK_LIST", cardA, 200, 80, 0, false, 480, 350);
        when(repository.saveAll(anyList())).thenReturn(List.of(saved));

        List<LockerLayoutItemResponse> result = service.saveLayout(
                userId, List.of(req("TASK_LIST", cardA, 200, 80, 0, false, 480, 350)));

        assertThat(result.get(0).posX()).isEqualTo(200);
        assertThat(result.get(0).posY()).isEqualTo(80);
        assertThat(result.get(0).width()).isEqualTo(480);
        assertThat(result.get(0).height()).isEqualTo(350);
    }

    @Test
    void saveLayout_acceptsNullPixelCoords() {
        UUID userId = UUID.randomUUID();
        UUID cardA = UUID.randomUUID();

        LockerLayoutItem saved = item(userId, "TASK_LIST", cardA, null, null, 0, false, null, null);
        when(repository.saveAll(anyList())).thenReturn(List.of(saved));

        // Legacy record without pixel coords — should not throw
        List<LockerLayoutItemResponse> result = service.saveLayout(
                userId, List.of(new LockerLayoutItemRequest("TASK_LIST", cardA, 1, 4, 0, false, null, null, null, null, null)));

        assertThat(result).hasSize(1);
    }

    @Test
    void saveLayout_rejectsNegativePosX() {
        UUID userId = UUID.randomUUID();
        UUID cardA = UUID.randomUUID();

        assertThatThrownBy(() -> service.saveLayout(
                        userId, List.of(new LockerLayoutItemRequest("TASK_LIST", cardA, 1, 4, 0, false, -1, 0, null, 320, 220))))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("posX must be >= 0");
    }

    @Test
    void saveLayout_rejectsNegativePosY() {
        UUID userId = UUID.randomUUID();
        UUID cardA = UUID.randomUUID();

        assertThatThrownBy(() -> service.saveLayout(
                        userId, List.of(new LockerLayoutItemRequest("TASK_LIST", cardA, 1, 4, 0, false, 0, -1, null, 320, 220))))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("posY must be >= 0");
    }

    @Test
    void saveLayout_rejectsWidthBelowMinimum() {
        UUID userId = UUID.randomUUID();
        UUID cardA = UUID.randomUUID();

        assertThatThrownBy(() -> service.saveLayout(
                        userId, List.of(new LockerLayoutItemRequest("TASK_LIST", cardA, 1, 4, 0, false, 0, 0, null, 0, 220))))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("width must be between 1 and 4000");
    }

    @Test
    void saveLayout_rejectsHeightBelowMinimum() {
        UUID userId = UUID.randomUUID();
        UUID cardA = UUID.randomUUID();

        assertThatThrownBy(() -> service.saveLayout(
                        userId, List.of(new LockerLayoutItemRequest("TASK_LIST", cardA, 1, 4, 0, false, 0, 0, null, 320, 0))))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("height must be between 1 and 4000");
    }

    @Test
    void saveLayout_rejectsWidthAboveMaximum() {
        UUID userId = UUID.randomUUID();
        UUID cardA = UUID.randomUUID();

        assertThatThrownBy(() -> service.saveLayout(
                        userId, List.of(new LockerLayoutItemRequest("TASK_LIST", cardA, 1, 4, 0, false, 0, 0, null, 5000, 220))))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("width must be between 1 and 4000");
    }

    private LockerLayoutItemRequest req(
            String cardType, UUID cardId, int posX, int posY, int order, boolean minimized, int width, int height) {
        return new LockerLayoutItemRequest(cardType, cardId, 1, 8, order, minimized, posX, posY, null, width, height);
    }

    private LockerLayoutItem item(
            UUID userId, String cardType, UUID cardId, Integer posX, Integer posY, int order, boolean minimized,
            Integer width, Integer height) {
        LockerLayoutItem item = new LockerLayoutItem();
        item.setUserId(userId);
        item.setCardType(cardType);
        item.setCardId(cardId);
        item.setGridCol(1);
        item.setColSpan(8);
        item.setItemOrder(order);
        item.setMinimized(minimized);
        item.setPosX(posX);
        item.setPosY(posY);
        item.setWidth(width);
        item.setHeight(height);
        return item;
    }
}
