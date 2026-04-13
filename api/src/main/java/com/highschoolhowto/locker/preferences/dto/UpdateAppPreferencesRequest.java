package com.highschoolhowto.locker.preferences.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

public record UpdateAppPreferencesRequest(
        @NotNull @Size(min = 1, max = 5) List<String> activeApps,
        List<String> paneOrder,
        @NotBlank String paletteName,
        @Pattern(regexp = "^#[0-9a-fA-F]{6}$", message = "lockerColor must be a valid 6-digit hex color")
        String lockerColor,
        @Size(max = 50)
        String fontFamily) {}
