package com.highschoolhowto.social.dto;

import com.highschoolhowto.social.SocialLink;

public record AdminSocialLinkResponse(Long id, String platform, String displayName, String url, int displayOrder, boolean enabled) {
    public static AdminSocialLinkResponse from(SocialLink link) {
        return new AdminSocialLinkResponse(link.getId(), link.getPlatform(), link.getDisplayName(), link.getUrl(), link.getDisplayOrder(), link.isEnabled());
    }
}
