package com.highschoolhowto.homelayout;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HomeSectionRepository extends JpaRepository<HomeSection, Long> {

    List<HomeSection> findAllByOrderBySortOrderAsc();
}
