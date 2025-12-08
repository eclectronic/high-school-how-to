package com.highschoolhowto.notification;

import com.highschoolhowto.user.User;

public interface NotificationService {
    void sendVerificationEmail(User user, String verificationLink);

    void sendPasswordResetEmail(User user, String resetLink);
}
