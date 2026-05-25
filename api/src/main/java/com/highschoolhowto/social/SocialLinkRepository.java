package com.highschoolhowto.social;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SocialLinkRepository extends JpaRepository<SocialLink, Long> {
    List<SocialLink> findByEnabledTrueAndUrlIsNotNullOrderByDisplayOrderAsc();
    List<SocialLink> findAllByOrderByDisplayOrderAsc();
}
