import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  ContentCard,
  ContentCardAdmin,
  ContentCardSummary,
  HomeLayoutResponse,
  ImageUploadResponse,
  LockerStatusResponse,
  SaveCardRequest,
  SaveTagRequest,
  Tag,
} from '../models/content.models';
import { TaskList } from '../models/task.models';

@Injectable({ providedIn: 'root' })
export class ContentApiService {
  private readonly http = inject(HttpClient);

  // Public
  getPublishedCards() {
    return this.http.get<ContentCard[]>('/api/content/cards');
  }

  getCardBySlug(slug: string) {
    return this.http.get<ContentCard>(`/api/content/cards/${slug}`);
  }

  addToLocker(slug: string) {
    return this.http.post<TaskList>(`/api/content/cards/${slug}/add-to-locker`, {});
  }

  getLockerStatus(slug: string) {
    return this.http.get<LockerStatusResponse>(`/api/content/cards/${slug}/locker-status`);
  }

  getAllTags() {
    return this.http.get<Tag[]>('/api/tags');
  }

  getCardsByTag(tagSlug: string) {
    return this.http.get<ContentCard[]>(`/api/tags/${tagSlug}/cards`);
  }

  getHomeLayout() {
    return this.http.get<HomeLayoutResponse>('/api/pages/home/layout');
  }

  // Admin — tags
  adminListTags() {
    return this.http.get<Tag[]>('/api/admin/tags');
  }

  adminCreateTag(req: SaveTagRequest) {
    return this.http.post<Tag>('/api/admin/tags', req);
  }

  adminUpdateTag(id: number, req: SaveTagRequest) {
    return this.http.put<Tag>(`/api/admin/tags/${id}`, req);
  }

  adminDeleteTag(id: number) {
    return this.http.delete<void>(`/api/admin/tags/${id}`);
  }

  // Admin — content cards
  adminListCards() {
    return this.http.get<ContentCardAdmin[]>('/api/admin/content');
  }

  adminGetCard(id: number) {
    return this.http.get<ContentCardAdmin>(`/api/admin/content/${id}`);
  }

  adminCreateCard(req: SaveCardRequest) {
    return this.http.post<ContentCardAdmin>('/api/admin/content', req);
  }

  adminUpdateCard(id: number, req: SaveCardRequest) {
    return this.http.put<ContentCardAdmin>(`/api/admin/content/${id}`, req);
  }

  adminDeleteCard(id: number) {
    return this.http.delete<void>(`/api/admin/content/${id}`);
  }

  // Admin — image upload (thumbnail/cover images)
  adminUploadImage(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ImageUploadResponse>('/api/admin/images/upload', formData);
  }

  // Admin — image upload for article body content (rich text editor)
  adminUploadContentImage(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ImageUploadResponse>('/api/admin/images/upload/content', formData);
  }

  // Admin — content search (for link picker typeahead)
  searchCards(query: string, exclude?: number) {
    const params: Record<string, string | number> = { q: query };
    if (exclude !== undefined) {
      params['exclude'] = exclude;
    }
    return this.http.get<ContentCardSummary[]>('/api/admin/content/search', { params });
  }

}
