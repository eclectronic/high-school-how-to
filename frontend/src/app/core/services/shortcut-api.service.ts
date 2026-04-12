import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Shortcut } from '../models/task.models';

export interface CreateShortcutRequest {
  url: string;
  name?: string | null;
  faviconUrl?: string | null;
  emoji?: string | null;
  iconUrl?: string | null;
}

export interface UpdateShortcutRequest {
  url: string;
  name: string;
  faviconUrl?: string | null;
  emoji?: string | null;
  iconUrl?: string | null;
}

export interface ShortcutMetadata {
  title: string;
  faviconUrl: string | null;
}

export interface ImportShortcutItem {
  url: string;
  name?: string | null;
  emoji?: string | null;
  iconUrl?: string | null;
}

export interface ImportShortcutsRequest {
  version: number;
  shortcuts: ImportShortcutItem[];
}

export interface ImportShortcutsResponse {
  imported: number;
  skipped: number;
  reason: string | null;
}

@Injectable({ providedIn: 'root' })
export class ShortcutApiService {
  private readonly http = inject(HttpClient);

  getShortcuts(): Observable<Shortcut[]> {
    return this.http.get<Shortcut[]>('/api/shortcuts');
  }

  createShortcut(request: CreateShortcutRequest): Observable<Shortcut> {
    return this.http.post<Shortcut>('/api/shortcuts', request);
  }

  updateShortcut(id: string, request: UpdateShortcutRequest): Observable<Shortcut> {
    return this.http.put<Shortcut>(`/api/shortcuts/${id}`, request);
  }

  deleteShortcut(id: string): Observable<void> {
    return this.http.delete<void>(`/api/shortcuts/${id}`);
  }

  getMetadata(url: string): Observable<ShortcutMetadata> {
    return this.http.get<ShortcutMetadata>('/api/shortcuts/metadata', { params: { url } });
  }

  importShortcuts(request: ImportShortcutsRequest): Observable<ImportShortcutsResponse> {
    return this.http.post<ImportShortcutsResponse>('/api/shortcuts/import', request);
  }

  exportShortcuts(): Observable<Shortcut[]> {
    return this.http.get<Shortcut[]>('/api/shortcuts/export');
  }

  reorderShortcuts(ids: string[]): Observable<void> {
    return this.http.put<void>('/api/shortcuts/reorder', { ids });
  }
}
