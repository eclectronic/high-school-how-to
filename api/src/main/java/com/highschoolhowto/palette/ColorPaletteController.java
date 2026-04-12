package com.highschoolhowto.palette;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ColorPaletteController {

    private final ColorPaletteService service;

    public ColorPaletteController(ColorPaletteService service) {
        this.service = service;
    }

    /** Returns the current color palette (list of color strings, ordered by position). */
    @GetMapping("/api/color-palette")
    public List<String> getPalette() {
        return service.getColors();
    }

    /** Replaces the entire palette. Expects a JSON array of 1–32 color strings. */
    @PutMapping("/api/admin/color-palette")
    @PreAuthorize("hasRole('ADMIN')")
    public List<String> replacePalette(@RequestBody @Valid @NotNull @Size(min = 1, max = 32) List<String> colors) {
        return service.replaceAll(colors);
    }
}
