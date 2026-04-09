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

        LockerLayoutItem itemA = item(userId, "TASK_LIST", cardA, 1, 4, 0, false);
        LockerLayoutItem itemB = item(userId, "TASK_LIST", cardB, 5, 4, 1, false);
        when(repository.findByUserIdOrderByItemOrder(userId)).thenReturn(List.of(itemA, itemB));

        List<LockerLayoutItemResponse> result = service.getLayout(userId);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).cardId()).isEqualTo(cardA);
        assertThat(result.get(1).cardId()).isEqualTo(cardB);
        assertThat(result.get(0).col()).isEqualTo(1);
        assertThat(result.get(0).colSpan()).isEqualTo(4);
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
                new LockerLayoutItemRequest("TASK_LIST", cardA, 1, 4, 0, false),
                new LockerLayoutItemRequest("TASK_LIST", cardB, 5, 4, 1, false));

        LockerLayoutItem savedA = item(userId, "TASK_LIST", cardA, 1, 4, 0, false);
        LockerLayoutItem savedB = item(userId, "TASK_LIST", cardB, 5, 4, 1, false);
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
                .thenReturn(List.of(item(userId, "TASK_LIST", cardA, 1, 4, 0, false)));

        service.saveLayout(userId, List.of(new LockerLayoutItemRequest("TASK_LIST", cardA, 1, 4, 0, false)));

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
        LockerLayoutItem itemB = item(userId, "TASK_LIST", cardB, 5, 4, 1, false);
        LockerLayoutItem itemA = item(userId, "TASK_LIST", cardA, 1, 4, 0, false);
        when(repository.saveAll(anyList())).thenReturn(List.of(itemB, itemA));

        List<LockerLayoutItemResponse> result = service.saveLayout(userId, List.of(
                new LockerLayoutItemRequest("TASK_LIST", cardA, 1, 4, 0, false),
                new LockerLayoutItemRequest("TASK_LIST", cardB, 5, 4, 1, false)));

        assertThat(result.get(0).cardId()).isEqualTo(cardA);
        assertThat(result.get(1).cardId()).isEqualTo(cardB);
    }

    @Test
    void saveLayout_persistsMinimizedState() {
        UUID userId = UUID.randomUUID();
        UUID cardA = UUID.randomUUID();

        LockerLayoutItem saved = item(userId, "NOTE", cardA, 1, 4, 0, true);
        when(repository.saveAll(anyList())).thenReturn(List.of(saved));

        List<LockerLayoutItemResponse> result = service.saveLayout(
                userId, List.of(new LockerLayoutItemRequest("NOTE", cardA, 1, 4, 0, true)));

        assertThat(result.get(0).minimized()).isTrue();
    }

    @Test
    void saveLayout_rejectsColLessThanOne() {
        UUID userId = UUID.randomUUID();
        UUID cardA = UUID.randomUUID();

        assertThatThrownBy(() -> service.saveLayout(
                        userId, List.of(new LockerLayoutItemRequest("TASK_LIST", cardA, 0, 4, 0, false))))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("col must be >= 1");
    }

    @Test
    void saveLayout_rejectsColSpanLessThanOne() {
        UUID userId = UUID.randomUUID();
        UUID cardA = UUID.randomUUID();

        assertThatThrownBy(() -> service.saveLayout(
                        userId, List.of(new LockerLayoutItemRequest("TASK_LIST", cardA, 1, 0, 0, false))))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("colSpan must be >= 1");
    }

    @Test
    void saveLayout_rejectsColGreaterThan12() {
        UUID userId = UUID.randomUUID();
        UUID cardA = UUID.randomUUID();

        assertThatThrownBy(() -> service.saveLayout(
                        userId, List.of(new LockerLayoutItemRequest("TASK_LIST", cardA, 13, 1, 0, false))))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("col must be <= 12");
    }

    @Test
    void saveLayout_rejectsItemOverflowingColumns() {
        UUID userId = UUID.randomUUID();
        UUID cardA = UUID.randomUUID();

        // col=10, colSpan=4 → col+colSpan=14 > 13
        assertThatThrownBy(() -> service.saveLayout(
                        userId, List.of(new LockerLayoutItemRequest("TASK_LIST", cardA, 10, 4, 0, false))))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("col + colSpan must be <= 13");
    }

    @Test
    void saveLayout_acceptsItemAtMaxBoundary() {
        UUID userId = UUID.randomUUID();
        UUID cardA = UUID.randomUUID();

        // col=9, colSpan=4 → col+colSpan=13, valid
        LockerLayoutItem saved = item(userId, "TASK_LIST", cardA, 9, 4, 0, false);
        when(repository.saveAll(anyList())).thenReturn(List.of(saved));

        List<LockerLayoutItemResponse> result = service.saveLayout(
                userId, List.of(new LockerLayoutItemRequest("TASK_LIST", cardA, 9, 4, 0, false)));

        assertThat(result).hasSize(1);
        assertThat(result.get(0).col()).isEqualTo(9);
    }

    private LockerLayoutItem item(
            UUID userId, String cardType, UUID cardId, int col, int colSpan, int order, boolean minimized) {
        LockerLayoutItem item = new LockerLayoutItem();
        item.setUserId(userId);
        item.setCardType(cardType);
        item.setCardId(cardId);
        item.setGridCol(col);
        item.setColSpan(colSpan);
        item.setItemOrder(order);
        item.setMinimized(minimized);
        return item;
    }
}
