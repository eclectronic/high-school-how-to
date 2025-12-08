package com.highschoolhowto.notification;

import com.highschoolhowto.user.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(
        prefix = "notifications.graph",
        name = "enabled",
        havingValue = "false",
        matchIfMissing = true)
public class LoggingNotificationService implements NotificationService {

    private static final Logger log = LoggerFactory.getLogger(LoggingNotificationService.class);

    @Override
    public void sendVerificationEmail(User user, String verificationLink) {
        log.info("Sending verification email to {} -> {}", user.getEmail(), verificationLink);
    }

    @Override
    public void sendPasswordResetEmail(User user, String resetLink) {
        log.info("Sending password reset email to {} -> {}", user.getEmail(), resetLink);
    }
}
