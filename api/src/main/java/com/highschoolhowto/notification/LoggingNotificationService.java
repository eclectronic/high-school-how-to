package com.highschoolhowto.notification;

import com.highschoolhowto.user.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(
        prefix = "notifications.ses",
        name = "enabled",
        havingValue = "false",
        matchIfMissing = true)
public class LoggingNotificationService implements NotificationService {

    private static final Logger log = LoggerFactory.getLogger(LoggingNotificationService.class);

    @Override
    public void sendVerificationEmail(User user, String verificationLink) {
        log.warn(
                "DEV MODE: notifications.ses.enabled=false, so no real email sent. Verification link fo{} -> {}",
                user.getEmail(),
                verificationLink);
    }

    @Override
    public void sendPasswordResetEmail(User user, String resetLink) {
        log.warn(
                "DEV MODE: notifications.ses.enabled=false, so no real email sent. Password reset link for {} -> {}",
                user.getEmail(),
                resetLink);
    }
}
