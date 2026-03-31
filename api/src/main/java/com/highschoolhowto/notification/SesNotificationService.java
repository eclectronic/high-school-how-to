package com.highschoolhowto.notification;

import com.highschoolhowto.user.User;
import java.util.StringJoiner;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sesv2.SesV2Client;
import software.amazon.awssdk.services.sesv2.model.Body;
import software.amazon.awssdk.services.sesv2.model.Content;
import software.amazon.awssdk.services.sesv2.model.Destination;
import software.amazon.awssdk.services.sesv2.model.EmailContent;
import software.amazon.awssdk.services.sesv2.model.Message;
import software.amazon.awssdk.services.sesv2.model.SendEmailRequest;

@Service
@ConditionalOnProperty(prefix = "notifications.ses", name = "enabled", havingValue = "true")
public class SesNotificationService implements NotificationService {

    private static final Logger log = LoggerFactory.getLogger(SesNotificationService.class);

    private final SesV2Client sesClient;
    private final String fromAddress;

    public SesNotificationService(
            @Value("${notifications.ses.region}") String region,
            @Value("${notifications.ses.from-address}") String fromAddress) {
        this.fromAddress = fromAddress;
        this.sesClient = SesV2Client.builder()
                .region(Region.of(region))
                .build();
    }

    @Override
    public void sendVerificationEmail(User user, String verificationLink) {
        EmailContent content = renderEmail(
                "Verify your High School How To account",
                "Confirm your email to activate your account.",
                verificationLink,
                displayName(user));
        send(user.getEmail(), content);
    }

    @Override
    public void sendPasswordResetEmail(User user, String resetLink) {
        EmailContent content = renderEmail(
                "Reset your High School How To password",
                "Use the link below to reset your password.",
                resetLink,
                displayName(user));
        send(user.getEmail(), content);
    }

    private void send(String to, EmailContent content) {
        SendEmailRequest request = SendEmailRequest.builder()
                .fromEmailAddress(fromAddress)
                .destination(Destination.builder().toAddresses(to).build())
                .content(content)
                .build();
        try {
            sesClient.sendEmail(request);
            log.info("SES email sent to {}", to);
        } catch (Exception ex) {
            log.error("Failed to send SES email to {}: {}", to, ex.getMessage(), ex);
            throw ex;
        }
    }

    private EmailContent renderEmail(String subject, String intro, String actionLink, String name) {
        String safeName = name == null || name.isBlank() ? "there" : name;

        String htmlBody = new StringJoiner("\n")
                .add("<!doctype html>")
                .add("<html>")
                .add("<body style=\"margin:0;padding:0;background:#fdf3df url('https://highschoolhowto.com/assets/images/bulletin-board-tile-256.png');background-size:256px 256px;font-family:'Helvetica Neue',Arial,sans-serif;color:#2d1a10;\">")
                .add("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"padding:32px 0;\">")
                .add("<tr><td align=\"center\">")
                .add("<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" width=\"640\" style=\"background:#fffef8;border:2px solid #e4d4b8;border-radius:16px;box-shadow:0 14px 28px rgba(45,26,16,0.12);padding:0;overflow:hidden;\">")
                .add("<tr><td style=\"background:linear-gradient(135deg,#f8d99f 0%,#ffd8b5 45%,#ffd8b5 55%,#f5c88e 100%);padding:18px 24px;text-align:center;\">")
                .add("<div style=\"display:inline-block;padding:10px 18px;border-radius:999px;background:#2d1a10;color:#fff;font-weight:800;letter-spacing:0.5px;box-shadow:0 6px 16px rgba(0,0,0,0.12);\">High School How To</div>")
                .add("</td></tr>")
                .add("<tr><td style=\"padding:28px 32px;text-align:center;\">")
                .add("<h1 style=\"margin:0 0 12px;font-size:24px;\">" + escape(subject) + "</h1>")
                .add("<p style=\"margin:0 0 12px;font-size:16px;line-height:1.6;\">Hi " + escape(safeName) + ",</p>")
                .add("<p style=\"margin:0 0 20px;font-size:16px;line-height:1.6;\">" + escape(intro) + "</p>")
                .add("<a href=\"" + actionLink + "\" style=\"display:inline-block;padding:14px 22px;border-radius:12px;background:#2d1a10;color:#fff;text-decoration:none;font-weight:800;box-shadow:0 10px 18px rgba(45,26,16,0.18);\">Open link</a>")
                .add("<p style=\"margin:22px 0 0;font-size:14px;line-height:1.5;color:#5a4a3a;\">If you didn't request this, you can safely ignore this email.</p>")
                .add("</td></tr>")
                .add("</table>")
                .add("</td></tr></table>")
                .add("</body></html>")
                .toString();

        return EmailContent.builder()
                .simple(Message.builder()
                        .subject(Content.builder().data(subject).charset("UTF-8").build())
                        .body(Body.builder()
                                .html(Content.builder().data(htmlBody).charset("UTF-8").build())
                                .build())
                        .build())
                .build();
    }

    private String escape(String input) {
        return input
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;");
    }

    private String displayName(User user) {
        if (user.getFirstName() != null && user.getLastName() != null) {
            return user.getFirstName() + " " + user.getLastName();
        }
        if (user.getFirstName() != null) {
            return user.getFirstName();
        }
        return "there";
    }
}
