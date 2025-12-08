package com.highschoolhowto.audit;

import com.highschoolhowto.user.User;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);

    private final AuditEventRepository repository;

    public AuditService(AuditEventRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public void record(AuditEventType type, User user, String email, String metadata) {
        AuditEvent event = new AuditEvent();
        event.setEventType(type);
        Optional.ofNullable(user).ifPresent(event::setUser);
        event.setEmail(email);
        event.setMetadata(metadata);
        repository.save(event);
        log.debug("Recorded audit event {}", type);
    }
}
