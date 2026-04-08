package com.highschoolhowto.sticker;

import com.highschoolhowto.security.UserPrincipal;
import com.highschoolhowto.sticker.dto.CreateStickerRequest;
import com.highschoolhowto.sticker.dto.CreateStickerResponse;
import com.highschoolhowto.sticker.dto.StickerResponse;
import com.highschoolhowto.sticker.dto.UpdateStickerRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
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
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/stickers")
@PreAuthorize("isAuthenticated()")
public class StickerController {

    private final StickerService stickerService;

    public StickerController(StickerService stickerService) {
        this.stickerService = stickerService;
    }

    @GetMapping
    public ResponseEntity<List<StickerResponse>> all(@AuthenticationPrincipal UserPrincipal principal) {
        UUID userId = principal.getUser().getId();
        return ResponseEntity.ok(stickerService.getStickers(userId));
    }

    @PostMapping
    public ResponseEntity<CreateStickerResponse> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateStickerRequest request) {
        UUID userId = principal.getUser().getId();
        return ResponseEntity.ok(stickerService.createSticker(userId, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<StickerResponse> update(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID id,
            @Valid @RequestBody UpdateStickerRequest request) {
        UUID userId = principal.getUser().getId();
        return ResponseEntity.ok(stickerService.updateSticker(userId, id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID id) {
        UUID userId = principal.getUser().getId();
        stickerService.deleteSticker(userId, id);
        return ResponseEntity.noContent().build();
    }
}
