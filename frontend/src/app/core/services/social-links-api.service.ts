import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SocialLink, AdminSocialLink, SocialLinkUpdateRequest } from '../models/social-links.models';

@Injectable({ providedIn: 'root' })
export class SocialLinksApiService {
  private readonly http = inject(HttpClient);

  readonly links = signal<SocialLink[]>([]);

  loadPublicLinks(): void {
    this.http.get<SocialLink[]>('/api/social-links').subscribe({
      next: (links) => this.links.set(links),
      error: () => {},
    });
  }

  listAdmin() {
    return this.http.get<AdminSocialLink[]>('/api/admin/social-links');
  }

  update(id: number, req: SocialLinkUpdateRequest) {
    return this.http.put<AdminSocialLink>(`/api/admin/social-links/${id}`, req);
  }
}
