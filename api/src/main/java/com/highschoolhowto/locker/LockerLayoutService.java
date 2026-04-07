package com.highschoolhowto.locker;

import com.highschoolhowto.locker.dto.LockerLayoutItemRequest;
import com.highschoolhowto.locker.dto.LockerLayoutItemResponse;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LockerLayoutService {

    private final LockerLayoutItemRepository repository;

    public LockerLayoutService(LockerLayoutItemRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<LockerLayoutItemResponse> getLayout(UUID userId) {
        return repository.findByUserIdOrderBySortOrder(userId).stream()
                .map(item -> new LockerLayoutItemResponse(item.getCardType(), item.getCardId(), item.getSortOrder()))
                .toList();
    }

    @Transactional
    public List<LockerLayoutItemResponse> saveLayout(UUID userId, List<LockerLayoutItemRequest> items) {
        repository.deleteByUserId(userId);
        repository.flush();
        List<LockerLayoutItem> entities = items.stream()
                .map(req -> {
                    LockerLayoutItem entity = new LockerLayoutItem();
                    entity.setUserId(userId);
                    entity.setCardType(req.cardType());
                    entity.setCardId(req.cardId());
                    entity.setSortOrder(req.sortOrder());
                    return entity;
                })
                .toList();
        List<LockerLayoutItem> saved = repository.saveAll(entities);
        return saved.stream()
                .sorted(java.util.Comparator.comparingInt(LockerLayoutItem::getSortOrder))
                .map(item -> new LockerLayoutItemResponse(item.getCardType(), item.getCardId(), item.getSortOrder()))
                .toList();
    }
}
