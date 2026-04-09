package com.highschoolhowto.badge;

import com.highschoolhowto.badge.dto.BadgeResponse;
import com.highschoolhowto.badge.dto.EarnedBadgeResponse;
import com.highschoolhowto.badge.dto.SaveBadgeRequest;
import com.highschoolhowto.security.UserPrincipal;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class BadgeController {

    private final BadgeService badgeService;

    public BadgeController(BadgeService badgeService) {
        this.badgeService = badgeService;
    }

    // ── Admin endpoints ──────────────────────────────────────────────────────

    @GetMapping("/api/admin/badges")
    @PreAuthorize("hasRole('ADMIN')")
    public List<BadgeResponse> adminListBadges() {
        return badgeService.listAll();
    }

    @PostMapping("/api/admin/badges")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public BadgeResponse adminCreateBadge(@Valid @RequestBody SaveBadgeRequest request) {
        return badgeService.create(request);
    }

    @PutMapping("/api/admin/badges/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public BadgeResponse adminUpdateBadge(@PathVariable Long id, @Valid @RequestBody SaveBadgeRequest request) {
        return badgeService.update(id, request);
    }

    @DeleteMapping("/api/admin/badges/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void adminDeleteBadge(@PathVariable Long id) {
        badgeService.delete(id);
    }

    // ── User endpoint ────────────────────────────────────────────────────────

    @GetMapping("/api/badges")
    public List<EarnedBadgeResponse> getEarnedBadges(@AuthenticationPrincipal UserPrincipal principal) {
        return badgeService.getEarnedBadges(principal.getUser().getId());
    }
}
