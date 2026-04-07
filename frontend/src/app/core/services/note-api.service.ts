import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Note } from '../models/task.models';

export interface CreateNoteRequest {
  title: string;
  content?: string | null;
  color?: string;
  textColor?: string | null;
  fontSize?: string | null;
}

export interface UpdateNoteRequest {
  title: string;
  content?: string | null;
  color?: string;
  textColor?: string | null;
  fontSize?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class NoteApiService {
  private readonly http = inject(HttpClient);

  getNotes(): Observable<Note[]> {
    return this.http.get<Note[]>('/api/notes');
  }

  createNote(request: CreateNoteRequest): Observable<Note> {
    return this.http.post<Note>('/api/notes', request);
  }

  updateNote(noteId: string, request: UpdateNoteRequest): Observable<Note> {
    return this.http.put<Note>(`/api/notes/${noteId}`, request);
  }

  deleteNote(noteId: string): Observable<void> {
    return this.http.delete<void>(`/api/notes/${noteId}`);
  }
}
