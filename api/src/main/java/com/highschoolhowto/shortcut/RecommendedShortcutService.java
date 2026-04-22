package com.highschoolhowto.shortcut;

import com.highschoolhowto.shortcut.dto.RecommendedShortcutResponse;
import com.highschoolhowto.shortcut.dto.SaveRecommendedShortcutRequest;
import com.highschoolhowto.web.ApiException;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class RecommendedShortcutService {

    private final RecommendedShortcutRepository repository;

    public RecommendedShortcutService(RecommendedShortcutRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<RecommendedShortcutResponse> listActive() {
        return repository.findByActiveTrueOrderByCategoryAscSortOrderAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<RecommendedShortcutResponse> listAll() {
        return repository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public RecommendedShortcutResponse create(SaveRecommendedShortcutRequest req) {
        RecommendedShortcut entity = new RecommendedShortcut();
        applyRequest(entity, req);
        return toResponse(repository.save(entity));
    }

    @Transactional
    public RecommendedShortcutResponse update(UUID id, SaveRecommendedShortcutRequest req) {
        RecommendedShortcut entity = repository.findById(id)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND, "Not found", "Recommended shortcut not found"));
        applyRequest(entity, req);
        return toResponse(repository.save(entity));
    }

    @Transactional
    public void delete(UUID id) {
        RecommendedShortcut entity = repository.findById(id)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND, "Not found", "Recommended shortcut not found"));
        repository.delete(entity);
    }

    private void applyRequest(RecommendedShortcut entity, SaveRecommendedShortcutRequest req) {
        entity.setName(req.name().trim());
        entity.setUrl(req.url().trim());
        entity.setEmoji(StringUtils.hasText(req.emoji()) ? req.emoji().trim() : null);
        entity.setFaviconUrl(StringUtils.hasText(req.faviconUrl()) ? req.faviconUrl().trim() : null);
        entity.setCategory(StringUtils.hasText(req.category()) ? req.category().trim() : null);
        entity.setSortOrder(req.sortOrder());
        entity.setActive(req.active());
    }

    private RecommendedShortcutResponse toResponse(RecommendedShortcut e) {
        return new RecommendedShortcutResponse(
                e.getId(),
                e.getName(),
                e.getUrl(),
                e.getEmoji(),
                e.getFaviconUrl(),
                e.getCategory(),
                e.getSortOrder(),
                e.isActive());
    }
}
