package com.highschoolhowto.palette;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ColorPaletteRepository extends JpaRepository<ColorPaletteEntry, Long> {
    List<ColorPaletteEntry> findAllByOrderByPositionAsc();
}
