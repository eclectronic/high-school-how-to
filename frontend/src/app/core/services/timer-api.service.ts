import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Timer } from '../models/task.models';

export interface CreateTimerRequest {
  title: string;
  color?: string;
  textColor?: string | null;
  focusDuration?: number;
  shortBreakDuration?: number;
  longBreakDuration?: number;
  sessionsBeforeLongBreak?: number;
  presetName?: string | null;
  linkedTaskListId?: string | null;
}

export interface UpdateTimerRequest {
  title: string;
  color?: string;
  textColor?: string | null;
  focusDuration?: number;
  shortBreakDuration?: number;
  longBreakDuration?: number;
  sessionsBeforeLongBreak?: number;
  presetName?: string | null;
  linkedTaskListId?: string | null;
  clearLinkedTaskList?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TimerApiService {
  private readonly http = inject(HttpClient);

  getTimers(): Observable<Timer[]> {
    return this.http.get<Timer[]>('/api/timers');
  }

  createTimer(request: CreateTimerRequest): Observable<Timer> {
    return this.http.post<Timer>('/api/timers', request);
  }

  updateTimer(timerId: string, request: UpdateTimerRequest): Observable<Timer> {
    return this.http.put<Timer>(`/api/timers/${timerId}`, request);
  }

  deleteTimer(timerId: string): Observable<void> {
    return this.http.delete<void>(`/api/timers/${timerId}`);
  }
}
