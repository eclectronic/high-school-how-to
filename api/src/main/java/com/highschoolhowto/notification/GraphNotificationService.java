package com.highschoolhowto.notification;

import com.azure.identity.ClientSecretCredential;
import com.azure.identity.ClientSecretCredentialBuilder;
import com.highschoolhowto.user.User;
import com.microsoft.graph.authentication.TokenCredentialAuthProvider;
import com.microsoft.graph.models.BodyType;
import com.microsoft.graph.models.EmailAddress;
import com.microsoft.graph.models.ItemBody;
import com.microsoft.graph.models.Message;
import com.microsoft.graph.models.Recipient;
import com.microsoft.graph.requests.GraphServiceClient;
import com.microsoft.graph.models.UserSendMailParameterSet;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(prefix = "notifications.graph", name = "enabled", havingValue = "true")
public class GraphNotificationService implements NotificationService {

    private static final Logger log = LoggerFactory.getLogger(GraphNotificationService.class);

    private final GraphServiceClient<?> graphClient;
    private final String fromAddress;

    public GraphNotificationService(
            @Value("${notifications.graph.tenant-id}") String tenantId,
            @Value("${notifications.graph.client-id}") String clientId,
            @Value("${notifications.graph.client-secret}") String clientSecret,
            @Value("${notifications.graph.from-address}") String fromAddress) {
        this.fromAddress = fromAddress;
        ClientSecretCredential credential = new ClientSecretCredentialBuilder()
                .tenantId(tenantId)
                .clientId(clientId)
                .clientSecret(clientSecret)
                .build();
        TokenCredentialAuthProvider authProvider =
                new TokenCredentialAuthProvider(List.of("https://graph.microsoft.com/.default"), credential);
        this.graphClient = GraphServiceClient.builder().authenticationProvider(authProvider).buildClient();
    }

    @Override
    public void sendVerificationEmail(User user, String verificationLink) {
        send(
                user.getEmail(),
                "Verify your High School How To account",
                """
                        Hi %s,

                        Confirm your email to activate your account:
                        %s

                        If you did not request this, you can ignore this email.
                        """
                        .formatted(displayName(user), verificationLink));
    }

    @Override
    public void sendPasswordResetEmail(User user, String resetLink) {
        send(
                user.getEmail(),
                "Reset your High School How To password",
                """
                        Hi %s,

                        Use the link below to reset your password:
                        %s

                        If you did not request a reset, you can ignore this email.
                        """
                        .formatted(displayName(user), resetLink));
    }

    private void send(String to, String subject, String body) {
        Message message = new Message();
        message.subject = subject;

        ItemBody itemBody = new ItemBody();
        itemBody.contentType = BodyType.TEXT;
        itemBody.content = body;
        message.body = itemBody;

        EmailAddress emailAddress = new EmailAddress();
        emailAddress.address = to;
        Recipient recipient = new Recipient();
        recipient.emailAddress = emailAddress;
        message.toRecipients = List.of(recipient);

        UserSendMailParameterSet requestBody = UserSendMailParameterSet.newBuilder()
                .withMessage(message)
                .withSaveToSentItems(false)
                .build();

        try {
            graphClient.users(fromAddress).sendMail(requestBody).buildRequest().post();
            log.info("Graph email sent to {} with subject '{}'", to, subject);
        } catch (RuntimeException ex) {
            log.error("Failed to send Graph email to {}: {}", to, ex.getMessage(), ex);
            throw ex;
        }
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
