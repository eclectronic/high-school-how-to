package com.highschoolhowto.notification;

import com.highschoolhowto.user.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dev")
@ConditionalOnProperty(prefix = "notifications.test", name = "enabled", havingValue = "true")
public class TestEmailController {

    private final NotificationService notificationService;

    public TestEmailController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @PostMapping("/test-email")
    public ResponseEntity<Void> sendTestEmail(@Valid @RequestBody TestEmailRequest request) {
        String link = request.link() == null || request.link().isBlank()
                ? "https://example.com/test-link"
                : request.link();
        if ("reset".equalsIgnoreCase(request.type())) {
            notificationService.sendPasswordResetEmail(testUser(request.to()), link);
        } else {
            notificationService.sendVerificationEmail(testUser(request.to()), link);
        }
        return ResponseEntity.accepted().build();
    }

    public record TestEmailRequest(
            @NotBlank String to,
            String type, // "verification" (default) or "reset"
            String link) {}

    private User testUser(String email) {
        var user = new User();
        user.setEmail(email);
        user.setFirstName("Test");
        user.setLastName("User");
        return user;
    }
}
