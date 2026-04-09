package com.highschoolhowto.timer;

import com.highschoolhowto.security.UserPrincipal;
import com.highschoolhowto.timer.dto.CreateTimerRequest;
import com.highschoolhowto.timer.dto.TimerResponse;
import com.highschoolhowto.timer.dto.UpdateTimerRequest;
import com.highschoolhowto.timer.dto.UpdateTimerResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
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
@RequestMapping("/api/timers")
public class TimerController {

    private final TimerService timerService;

    public TimerController(TimerService timerService) {
        this.timerService = timerService;
    }

    @GetMapping
    public ResponseEntity<List<TimerResponse>> all(@AuthenticationPrincipal UserPrincipal principal) {
        UUID userId = principal.getUser().getId();
        return ResponseEntity.ok(timerService.getTimers(userId));
    }

    @PostMapping
    public ResponseEntity<TimerResponse> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateTimerRequest request) {
        UUID userId = principal.getUser().getId();
        return ResponseEntity.ok(timerService.createTimer(userId, request));
    }

    @PutMapping("/{timerId}")
    public ResponseEntity<UpdateTimerResponse> update(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("timerId") UUID timerId,
            @Valid @RequestBody UpdateTimerRequest request) {
        UUID userId = principal.getUser().getId();
        return ResponseEntity.ok(timerService.updateTimer(userId, timerId, request));
    }

    @DeleteMapping("/{timerId}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("timerId") UUID timerId) {
        UUID userId = principal.getUser().getId();
        timerService.deleteTimer(userId, timerId);
        return ResponseEntity.noContent().build();
    }
}
