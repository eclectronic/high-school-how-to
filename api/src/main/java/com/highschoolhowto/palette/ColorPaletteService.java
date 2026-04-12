package com.highschoolhowto.palette;

import jakarta.validation.constraints.NotNull;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ColorPaletteService {

    private final ColorPaletteRepository repo;

    public ColorPaletteService(ColorPaletteRepository repo) {
        this.repo = repo;
    }

    public List<String> getColors() {
        return repo.findAllByOrderByPositionAsc().stream()
                .map(ColorPaletteEntry::getColor)
                .toList();
    }

    @Transactional
    public List<String> replaceAll(@NotNull List<String> colors) {
        repo.deleteAll();
        for (int i = 0; i < colors.size(); i++) {
            ColorPaletteEntry entry = new ColorPaletteEntry();
            entry.setPosition((short) i);
            entry.setColor(colors.get(i));
            repo.save(entry);
        }
        return colors;
    }
}
