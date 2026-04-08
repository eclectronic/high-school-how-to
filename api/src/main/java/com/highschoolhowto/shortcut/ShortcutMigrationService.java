package com.highschoolhowto.shortcut;

import jakarta.annotation.PostConstruct;
import jakarta.persistence.EntityManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class ShortcutMigrationService {

    private static final Logger log = LoggerFactory.getLogger(ShortcutMigrationService.class);

    private final EntityManager entityManager;

    public ShortcutMigrationService(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    @PostConstruct
    public void checkForOrphanedBookmarkListEntries() {
        Long count = (Long) entityManager
                .createQuery(
                        "SELECT COUNT(i) FROM LockerLayoutItem i WHERE i.cardType = 'BOOKMARK_LIST'")
                .getSingleResult();
        if (count != null && count > 0) {
            log.warn(
                    "Found {} locker_layout entries with cardType=BOOKMARK_LIST. "
                    + "These should have been removed by the v4-shortcuts-0038 migration. "
                    + "Run the migration to clean up.",
                    count);
        }
    }
}
