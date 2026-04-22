package com.highschoolhowto.locker.preferences.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;

public record UpdateAppPreferencesRequest(
        @NotNull @Size(min = 1, max = 5) List<String> activeApps,
        List<String> paneOrder,
        @NotBlank String paletteName,
        @Pattern(regexp = "^#[0-9a-fA-F]{6}$", message = "lockerColor must be a valid 6-digit hex color")
        String lockerColor,
        @Size(max = 50)
        String fontFamily,
        @Pattern(regexp = "^(SMALL|DEFAULT|LARGE|XLARGE)$", message = "lockerTextSize must be SMALL, DEFAULT, LARGE, or XLARGE")
        String lockerTextSize,
        Map<String, String> appColors) {}
