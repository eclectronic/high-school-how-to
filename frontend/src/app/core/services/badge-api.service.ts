import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Badge, EarnedBadge, BadgeTriggerType } from '../models/task.models';

export interface SaveBadgeRequest {
  name: string;
  description: string | null;
  emoji: string | null;
  iconUrl: string | null;
  triggerType: BadgeTriggerType;
  triggerParam: string | null;
}

@Injectable({ providedIn: 'root' })
export class BadgeApiService {
  private readonly http = inject(HttpClient);

  /** Returns the current user's earned badges. */
  getEarnedBadges(): Observable<EarnedBadge[]> {
    return this.http.get<EarnedBadge[]>('/api/badges');
  }

  // ── Admin ────────────────────────────────────────────────────────────────

  adminListBadges(): Observable<Badge[]> {
    return this.http.get<Badge[]>('/api/admin/badges');
  }

  adminCreateBadge(req: SaveBadgeRequest): Observable<Badge> {
    return this.http.post<Badge>('/api/admin/badges', req);
  }

  adminUpdateBadge(id: number, req: SaveBadgeRequest): Observable<Badge> {
    return this.http.put<Badge>(`/api/admin/badges/${id}`, req);
  }

  adminDeleteBadge(id: number): Observable<void> {
    return this.http.delete<void>(`/api/admin/badges/${id}`);
  }
}
