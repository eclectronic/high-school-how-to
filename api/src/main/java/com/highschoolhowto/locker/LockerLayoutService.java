package com.highschoolhowto.locker;

import com.highschoolhowto.locker.dto.LockerLayoutItemRequest;
import com.highschoolhowto.locker.dto.LockerLayoutItemResponse;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class LockerLayoutService {

    private final LockerLayoutItemRepository repository;

    public LockerLayoutService(LockerLayoutItemRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<LockerLayoutItemResponse> getLayout(UUID userId) {
        return repository.findByUserIdOrderByItemOrder(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public List<LockerLayoutItemResponse> saveLayout(UUID userId, List<LockerLayoutItemRequest> items) {
        for (LockerLayoutItemRequest req : items) {
            validate(req);
        }
        repository.deleteByUserId(userId);
        repository.flush();
        List<LockerLayoutItem> entities = items.stream()
                .map(req -> {
                    LockerLayoutItem entity = new LockerLayoutItem();
                    entity.setUserId(userId);
                    entity.setCardType(req.cardType());
                    entity.setCardId(req.cardId());
                    entity.setGridCol(req.col());
                    entity.setColSpan(req.colSpan());
                    entity.setItemOrder(req.order());
                    entity.setMinimized(req.minimized());
                    return entity;
                })
                .toList();
        List<LockerLayoutItem> saved = repository.saveAll(entities);
        return saved.stream()
                .sorted(java.util.Comparator.comparingInt(LockerLayoutItem::getItemOrder))
                .map(this::toResponse)
                .toList();
    }

    private void validate(LockerLayoutItemRequest req) {
        if (req.col() < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "col must be >= 1");
        }
        if (req.colSpan() < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "colSpan must be >= 1");
        }
        if (req.col() > 12) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "col must be <= 12");
        }
        if (req.col() + req.colSpan() > 13) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "col + colSpan must be <= 13 (item must fit within 12 columns)");
        }
    }

    private LockerLayoutItemResponse toResponse(LockerLayoutItem item) {
        return new LockerLayoutItemResponse(
                item.getCardType(),
                item.getCardId(),
                item.getGridCol(),
                item.getColSpan(),
                item.getItemOrder(),
                item.isMinimized());
    }
}
