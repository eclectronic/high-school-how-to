package com.highschoolhowto.locker;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LockerLayoutItemRepository extends JpaRepository<LockerLayoutItem, UUID> {
    List<LockerLayoutItem> findByUserIdOrderByItemOrder(UUID userId);

    @Modifying
    @Query("DELETE FROM LockerLayoutItem i WHERE i.userId = :userId")
    void deleteByUserId(@Param("userId") UUID userId);
}
