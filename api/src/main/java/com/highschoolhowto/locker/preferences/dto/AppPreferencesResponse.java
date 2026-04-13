package com.highschoolhowto.locker.preferences.dto;

import java.util.List;

public record AppPreferencesResponse(
        List<String> activeApps,
        List<String> paneOrder,
        String paletteName,
        String lockerColor,
        String fontFamily) {}
