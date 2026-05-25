export interface SocialLink {
  id: number;
  platform: string;
  displayName: string;
  url: string;
  displayOrder: number;
}

export interface AdminSocialLink extends SocialLink {
  enabled: boolean;
}

export interface SocialLinkUpdateRequest {
  url: string | null;
  enabled: boolean;
  displayOrder: number;
}
