package com.highschoolhowto.locker.preferences;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserAppPreferencesRepository extends JpaRepository<UserAppPreferences, UUID> {
    Optional<UserAppPreferences> findByUserId(UUID userId);
}
