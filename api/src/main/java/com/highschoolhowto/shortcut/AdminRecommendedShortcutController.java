package com.highschoolhowto.shortcut;

import com.highschoolhowto.shortcut.dto.RecommendedShortcutResponse;
import com.highschoolhowto.shortcut.dto.SaveRecommendedShortcutRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/recommended-shortcuts")
@PreAuthorize("hasRole('ADMIN')")
public class AdminRecommendedShortcutController {

    private final RecommendedShortcutService service;

    public AdminRecommendedShortcutController(RecommendedShortcutService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<RecommendedShortcutResponse>> list() {
        return ResponseEntity.ok(service.listAll());
    }

    @PostMapping
    public ResponseEntity<RecommendedShortcutResponse> create(
            @Valid @RequestBody SaveRecommendedShortcutRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RecommendedShortcutResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody SaveRecommendedShortcutRequest request) {
        return ResponseEntity.ok(service.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
