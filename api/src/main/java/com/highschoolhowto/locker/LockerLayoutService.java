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
                    entity.setPosX(req.posX());
                    entity.setPosY(req.posY());
                    entity.setMinHeight(req.minHeight());
                    entity.setWidth(req.width());
                    entity.setHeight(req.height());
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
        if (req.posX() != null && req.posX() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "posX must be >= 0");
        }
        if (req.posY() != null && req.posY() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "posY must be >= 0");
        }
        if (req.width() != null && (req.width() < 1 || req.width() > 4000)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "width must be between 1 and 4000");
        }
        if (req.height() != null && (req.height() < 1 || req.height() > 4000)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "height must be between 1 and 4000");
        }
    }

    private LockerLayoutItemResponse toResponse(LockerLayoutItem item) {
        return new LockerLayoutItemResponse(
                item.getCardType(),
                item.getCardId(),
                item.getGridCol(),
                item.getColSpan(),
                item.getItemOrder(),
                item.isMinimized(),
                item.getPosX(),
                item.getPosY(),
                item.getMinHeight(),
                item.getWidth(),
                item.getHeight());
    }
}
