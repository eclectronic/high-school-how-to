import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RecommendedPin } from '../models/task.models';

export interface SaveRecommendedPinRequest {
  name: string;
  url: string;
  emoji: string | null;
  faviconUrl: string | null;
  category: string | null;
  sortOrder: number;
  active: boolean;
}

@Injectable({ providedIn: 'root' })
export class RecommendedPinApiService {
  private readonly http = inject(HttpClient);

  getRecommendedPins(): Observable<RecommendedPin[]> {
    return this.http.get<RecommendedPin[]>('/api/shortcuts/recommended');
  }

  // ── Admin ────────────────────────────────────────────────────────────────

  adminList(): Observable<RecommendedPin[]> {
    return this.http.get<RecommendedPin[]>('/api/admin/recommended-shortcuts');
  }

  adminCreate(req: SaveRecommendedPinRequest): Observable<RecommendedPin> {
    return this.http.post<RecommendedPin>('/api/admin/recommended-shortcuts', req);
  }

  adminUpdate(id: string, req: SaveRecommendedPinRequest): Observable<RecommendedPin> {
    return this.http.put<RecommendedPin>(`/api/admin/recommended-shortcuts/${id}`, req);
  }

  adminDelete(id: string): Observable<void> {
    return this.http.delete<void>(`/api/admin/recommended-shortcuts/${id}`);
  }
}
