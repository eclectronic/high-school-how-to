import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface MediaAsset {
  id: number;
  url: string;
  filename: string | null;
  altText: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  uploadedAt: string;
}

export interface MediaPage {
  content: MediaAsset[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface MediaUsage {
  count: number;
  cards: { id: number; slug: string; title: string }[];
}

@Injectable({ providedIn: 'root' })
export class MediaApiService {
  private readonly http = inject(HttpClient);

  list(search: string = '', page = 0, size = 48, imagesOnly = false): Observable<MediaPage> {
    const params = new HttpParams()
      .set('search', search)
      .set('page', page)
      .set('size', size)
      .set('imagesOnly', imagesOnly);
    return this.http.get<MediaPage>('/api/admin/media', { params });
  }

  upload(file: File, subfolder = 'images', title?: string): Observable<MediaAsset> {
    const form = new FormData();
    form.append('file', file);
    form.append('subfolder', subfolder);
    if (title?.trim()) form.append('title', title.trim());
    return this.http.post<MediaAsset>('/api/admin/media', form);
  }

  patch(id: number, altText: string | null, filename: string | null): Observable<MediaAsset> {
    return this.http.patch<MediaAsset>(`/api/admin/media/${id}`, { altText, filename });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`/api/admin/media/${id}`);
  }

  usage(id: number): Observable<MediaUsage> {
    return this.http.get<MediaUsage>(`/api/admin/media/${id}/usage`);
  }
}
