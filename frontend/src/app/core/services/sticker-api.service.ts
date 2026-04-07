import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Sticker } from '../models/task.models';

export interface CreateStickerRequest {
  emoji: string;
  positionX: number;
  positionY: number;
  size?: string;
}

export interface UpdateStickerRequest {
  positionX: number;
  positionY: number;
  size?: string;
}

@Injectable({ providedIn: 'root' })
export class StickerApiService {
  private readonly http = inject(HttpClient);

  getStickers(): Observable<Sticker[]> {
    return this.http.get<Sticker[]>('/api/stickers');
  }

  createSticker(request: CreateStickerRequest): Observable<Sticker> {
    return this.http.post<Sticker>('/api/stickers', request);
  }

  updateSticker(id: string, request: UpdateStickerRequest): Observable<Sticker> {
    return this.http.put<Sticker>(`/api/stickers/${id}`, request);
  }

  deleteSticker(id: string): Observable<void> {
    return this.http.delete<void>(`/api/stickers/${id}`);
  }
}
