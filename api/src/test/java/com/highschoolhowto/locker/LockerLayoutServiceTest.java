package com.highschoolhowto.locker;

import static org.assertj.core.api.Assertions.assertThat;
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

@ExtendWith(MockitoExtension.class)
class LockerLayoutServiceTest {

    @Mock
    LockerLayoutItemRepository repository;

    @InjectMocks
    LockerLayoutService service;

    @Test
    void getLayout_returnsItemsInSortOrder() {
        UUID userId = UUID.randomUUID();
        UUID cardA = UUID.randomUUID();
        UUID cardB = UUID.randomUUID();

        LockerLayoutItem itemA = item(userId, "TASK_LIST", cardA, 0);
        LockerLayoutItem itemB = item(userId, "TASK_LIST", cardB, 1);
        when(repository.findByUserIdOrderBySortOrder(userId)).thenReturn(List.of(itemA, itemB));

        List<LockerLayoutItemResponse> result = service.getLayout(userId);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).cardId()).isEqualTo(cardA);
        assertThat(result.get(1).cardId()).isEqualTo(cardB);
        assertThat(result.get(0).sortOrder()).isEqualTo(0);
        assertThat(result.get(1).sortOrder()).isEqualTo(1);
    }

    @Test
    void getLayout_returnsEmptyListWhenNoItems() {
        UUID userId = UUID.randomUUID();
        when(repository.findByUserIdOrderBySortOrder(userId)).thenReturn(List.of());

        List<LockerLayoutItemResponse> result = service.getLayout(userId);

        assertThat(result).isEmpty();
    }

    @Test
    void saveLayout_deletesExistingAndSavesNew() {
        UUID userId = UUID.randomUUID();
        UUID cardA = UUID.randomUUID();
        UUID cardB = UUID.randomUUID();

        List<LockerLayoutItemRequest> requests = List.of(
                new LockerLayoutItemRequest("TASK_LIST", cardA, 0),
                new LockerLayoutItemRequest("TASK_LIST", cardB, 1));

        LockerLayoutItem savedA = item(userId, "TASK_LIST", cardA, 0);
        LockerLayoutItem savedB = item(userId, "TASK_LIST", cardB, 1);
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

        when(repository.saveAll(anyList())).thenReturn(List.of(item(userId, "TASK_LIST", cardA, 0)));

        service.saveLayout(userId, List.of(new LockerLayoutItemRequest("TASK_LIST", cardA, 0)));

        // verify delete was called before save
        var inOrder = org.mockito.Mockito.inOrder(repository);
        inOrder.verify(repository).deleteByUserId(userId);
        inOrder.verify(repository).saveAll(any());
    }

    @Test
    void saveLayout_returnsItemsSortedBySortOrder() {
        UUID userId = UUID.randomUUID();
        UUID cardA = UUID.randomUUID();
        UUID cardB = UUID.randomUUID();

        // Return items out of order from saveAll to verify sorting
        LockerLayoutItem itemB = item(userId, "TASK_LIST", cardB, 1);
        LockerLayoutItem itemA = item(userId, "TASK_LIST", cardA, 0);
        when(repository.saveAll(anyList())).thenReturn(List.of(itemB, itemA));

        List<LockerLayoutItemResponse> result = service.saveLayout(userId, List.of(
                new LockerLayoutItemRequest("TASK_LIST", cardA, 0),
                new LockerLayoutItemRequest("TASK_LIST", cardB, 1)));

        assertThat(result.get(0).cardId()).isEqualTo(cardA);
        assertThat(result.get(1).cardId()).isEqualTo(cardB);
    }

    private LockerLayoutItem item(UUID userId, String cardType, UUID cardId, int sortOrder) {
        LockerLayoutItem item = new LockerLayoutItem();
        item.setUserId(userId);
        item.setCardType(cardType);
        item.setCardId(cardId);
        item.setSortOrder(sortOrder);
        return item;
    }
}
