import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Bookmark, BookmarkList, EarnedBadge } from '../models/task.models';

export interface CreateBookmarkListResponse extends BookmarkList {
  earnedBadge?: EarnedBadge | null;
}

export interface CreateBookmarkListRequest {
  title: string;
  color?: string;
  textColor?: string | null;
}

export interface UpdateBookmarkListRequest {
  title: string;
  color?: string;
  textColor?: string | null;
}

export interface CreateBookmarkRequest {
  url: string;
  title?: string;
  faviconUrl?: string | null;
}

export interface UpdateBookmarkRequest {
  url: string;
  title: string;
  faviconUrl?: string | null;
}

export interface BookmarkMetadata {
  title: string;
  faviconUrl: string | null;
}

@Injectable({ providedIn: 'root' })
export class BookmarkApiService {
  private readonly http = inject(HttpClient);

  getBookmarkLists(): Observable<BookmarkList[]> {
    return this.http.get<BookmarkList[]>('/api/bookmarklists');
  }

  createBookmarkList(request: CreateBookmarkListRequest): Observable<CreateBookmarkListResponse> {
    return this.http.post<CreateBookmarkListResponse>('/api/bookmarklists', request);
  }

  updateBookmarkList(listId: string, request: UpdateBookmarkListRequest): Observable<BookmarkList> {
    return this.http.put<BookmarkList>(`/api/bookmarklists/${listId}`, request);
  }

  deleteBookmarkList(listId: string): Observable<void> {
    return this.http.delete<void>(`/api/bookmarklists/${listId}`);
  }

  addBookmark(listId: string, request: CreateBookmarkRequest): Observable<Bookmark> {
    return this.http.post<Bookmark>(`/api/bookmarklists/${listId}/bookmarks`, request);
  }

  updateBookmark(listId: string, bookmarkId: string, request: UpdateBookmarkRequest): Observable<Bookmark> {
    return this.http.put<Bookmark>(`/api/bookmarklists/${listId}/bookmarks/${bookmarkId}`, request);
  }

  reorderBookmarks(listId: string, orderedIds: string[]): Observable<void> {
    return this.http.put<void>(`/api/bookmarklists/${listId}/bookmarks/reorder`, { orderedIds });
  }

  deleteBookmark(listId: string, bookmarkId: string): Observable<void> {
    return this.http.delete<void>(`/api/bookmarklists/${listId}/bookmarks/${bookmarkId}`);
  }

  getMetadata(url: string): Observable<BookmarkMetadata> {
    return this.http.get<BookmarkMetadata>('/api/bookmarks/metadata', { params: { url } });
  }
}
