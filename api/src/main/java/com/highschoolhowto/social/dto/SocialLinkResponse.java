package com.highschoolhowto.social.dto;

import com.highschoolhowto.social.SocialLink;

public record SocialLinkResponse(Long id, String platform, String displayName, String url, int displayOrder) {
    public static SocialLinkResponse from(SocialLink link) {
        return new SocialLinkResponse(link.getId(), link.getPlatform(), link.getDisplayName(), link.getUrl(), link.getDisplayOrder());
    }
}
