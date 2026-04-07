package com.highschoolhowto.locker;

import com.highschoolhowto.locker.dto.LockerLayoutItemResponse;
import com.highschoolhowto.locker.dto.SaveLockerLayoutRequest;
import com.highschoolhowto.security.UserPrincipal;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/locker")
public class LockerLayoutController {

    private final LockerLayoutService lockerLayoutService;

    public LockerLayoutController(LockerLayoutService lockerLayoutService) {
        this.lockerLayoutService = lockerLayoutService;
    }

    @GetMapping("/layout")
    public ResponseEntity<List<LockerLayoutItemResponse>> getLayout(
            @AuthenticationPrincipal UserPrincipal principal) {
        UUID userId = principal.getUser().getId();
        return ResponseEntity.ok(lockerLayoutService.getLayout(userId));
    }

    @PostMapping("/layout")
    public ResponseEntity<List<LockerLayoutItemResponse>> saveLayout(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody SaveLockerLayoutRequest request) {
        UUID userId = principal.getUser().getId();
        return ResponseEntity.ok(lockerLayoutService.saveLayout(userId, request.items()));
    }
}
