package com.highschoolhowto.shortcut;

import com.highschoolhowto.security.UserPrincipal;
import com.highschoolhowto.shortcut.dto.CreateShortcutRequest;
import com.highschoolhowto.shortcut.dto.ImportShortcutsRequest;
import com.highschoolhowto.shortcut.dto.ImportShortcutsResponse;
import com.highschoolhowto.shortcut.dto.ShortcutMetadataResponse;
import com.highschoolhowto.shortcut.dto.ShortcutResponse;
import com.highschoolhowto.shortcut.dto.UpdateShortcutRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/shortcuts")
@PreAuthorize("isAuthenticated()")
public class ShortcutController {

    private final ShortcutService shortcutService;
    private final ShortcutMetadataService shortcutMetadataService;

    public ShortcutController(
            ShortcutService shortcutService,
            ShortcutMetadataService shortcutMetadataService) {
        this.shortcutService = shortcutService;
        this.shortcutMetadataService = shortcutMetadataService;
    }

    @GetMapping
    public ResponseEntity<List<ShortcutResponse>> all(
            @AuthenticationPrincipal UserPrincipal principal) {
        UUID userId = principal.getUser().getId();
        return ResponseEntity.ok(shortcutService.getShortcuts(userId));
    }

    @PostMapping
    public ResponseEntity<ShortcutResponse> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateShortcutRequest request) {
        UUID userId = principal.getUser().getId();
        ShortcutResponse created = shortcutService.createShortcut(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ShortcutResponse> update(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID id,
            @Valid @RequestBody UpdateShortcutRequest request) {
        UUID userId = principal.getUser().getId();
        return ResponseEntity.ok(shortcutService.updateShortcut(userId, id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID id) {
        UUID userId = principal.getUser().getId();
        shortcutService.deleteShortcut(userId, id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/metadata")
    public ResponseEntity<ShortcutMetadataResponse> metadata(
            @RequestParam("url") String url) {
        return ResponseEntity.ok(shortcutMetadataService.fetch(url));
    }

    @PostMapping("/import")
    public ResponseEntity<ImportShortcutsResponse> importShortcuts(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ImportShortcutsRequest request) {
        UUID userId = principal.getUser().getId();
        return ResponseEntity.ok(shortcutService.importShortcuts(userId, request));
    }

    @GetMapping("/export")
    public ResponseEntity<List<ShortcutResponse>> exportShortcuts(
            @AuthenticationPrincipal UserPrincipal principal) {
        UUID userId = principal.getUser().getId();
        return ResponseEntity.ok(shortcutService.exportShortcuts(userId));
    }
}
