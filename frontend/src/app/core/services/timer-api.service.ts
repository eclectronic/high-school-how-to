import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Timer, EarnedBadge } from '../models/task.models';

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
  /** Set to true when the client reports a focus session just completed. */
  focusSessionCompleted?: boolean;
  /** Set to true when a full study session (all focus + breaks) completed. */
  studySessionCompleted?: boolean;
}

export interface UpdateTimerResponse extends Timer {
  earnedBadge?: EarnedBadge | null;
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

  updateTimer(timerId: string, request: UpdateTimerRequest): Observable<UpdateTimerResponse> {
    return this.http.put<UpdateTimerResponse>(`/api/timers/${timerId}`, request);
  }

  deleteTimer(timerId: string): Observable<void> {
    return this.http.delete<void>(`/api/timers/${timerId}`);
  }
}
