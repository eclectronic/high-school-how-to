import { Injectable } from '@angular/core';

type TimerMode = 'BASIC' | 'POMODORO';
type PomodoroPhase = 'focus' | 'short-break' | 'long-break';

export interface TimerSnapshot {
  timerId: string;
  mode: TimerMode;

  remainingSeconds: number;
  wasRunning: boolean;
  done: boolean;

  pomodoroPhase: PomodoroPhase;
  pomodoroRemaining: number;
  pomodoroWasRunning: boolean;
  pomodoroDone: boolean;
  sessionsCompleted: number;

  /** Date.now() when the component was destroyed while the timer was running. */
  closedAt: number | null;
}

@Injectable({ providedIn: 'root' })
export class TimerStateService {
  private snapshot: TimerSnapshot | null = null;

  save(snapshot: TimerSnapshot): void {
    this.snapshot = snapshot;
  }

  restore(): TimerSnapshot | null {
    return this.snapshot;
  }
}
