package com.highschoolhowto.locker.preferences.dto;

import java.util.List;
import java.util.Map;

public record AppPreferencesResponse(
        List<String> activeApps,
        List<String> paneOrder,
        String paletteName,
        String lockerColor,
        String fontFamily,
        String lockerTextSize,
        Map<String, String> appColors) {}
