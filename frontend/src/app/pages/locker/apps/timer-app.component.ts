import { Component, Input, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimerApiService } from '../../../core/services/timer-api.service';
import { TimerSoundService } from '../../../core/services/timer-sound.service';
import { Timer } from '../../../core/models/task.models';

type TimerMode = 'BASIC' | 'POMODORO';
type PomodoroPhase = 'focus' | 'short-break' | 'long-break';

@Component({
  selector: 'app-timer-app',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './timer-app.component.html',
  styleUrl: './timer-app.component.scss',
})
export class TimerAppComponent implements OnInit, OnDestroy {
  @Input() paletteColor = '#0f9b8e';

  private readonly timerApi = inject(TimerApiService);
  private readonly timerSound = inject(TimerSoundService);

  protected timer = signal<Timer | null>(null);
  protected loading = signal(true);

  // Mode
  protected mode = signal<TimerMode>('BASIC');

  // Basic timer state
  protected remainingSeconds = signal(0);
  protected running = signal(false);
  protected done = signal(false);

  // Basic timer edit fields (in minutes/seconds)
  protected editHours = 0;
  protected editMinutes = 25;
  protected editSeconds = 0;
  protected editingDuration = signal(false);

  // Pomodoro state
  protected pomodoroPhase = signal<PomodoroPhase>('focus');
  protected sessionsCompleted = signal(0);
  protected pomodoroRemaining = signal(0);
  protected pomodoroRunning = signal(false);
  protected pomodoroDone = signal(false);
  protected showPomodoroSettings = signal(false);

  private intervalId: ReturnType<typeof setInterval> | null = null;

  protected formattedRemaining = computed(() => {
    return this.formatSeconds(this.remainingSeconds());
  });

  protected formattedPomodoroRemaining = computed(() => {
    return this.formatSeconds(this.pomodoroRemaining());
  });

  protected phaseLabel = computed<string>(() => {
    switch (this.pomodoroPhase()) {
      case 'focus': return 'Focus';
      case 'short-break': return 'Short Break';
      case 'long-break': return 'Long Break';
    }
  });

  ngOnInit(): void {
    this.timerApi.getTimers().subscribe({
      next: timers => {
        if (timers.length > 0) {
          this.loadTimer(timers[0]);
        } else {
          this.createDefaultTimer();
        }
      },
      error: () => this.loading.set(false),
    });
  }

  ngOnDestroy(): void {
    this.clearInterval();
  }

  private loadTimer(t: Timer): void {
    this.timer.set(t);
    this.mode.set(t.timerType);
    this.initBasicTimer(t);
    this.initPomodoroTimer(t);
    this.loading.set(false);
  }

  private createDefaultTimer(): void {
    this.timerApi.createTimer({
      title: 'My Timer',
      color: this.paletteColor,
      timerType: 'BASIC',
      basicDurationSeconds: 25 * 60,
      focusDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      sessionsBeforeLongBreak: 4,
    }).subscribe({
      next: t => this.loadTimer(t),
      error: () => this.loading.set(false),
    });
  }

  private initBasicTimer(t: Timer): void {
    const total = t.basicDurationSeconds;
    this.remainingSeconds.set(total);
    this.editHours = Math.floor(total / 3600);
    this.editMinutes = Math.floor((total % 3600) / 60);
    this.editSeconds = total % 60;
  }

  private initPomodoroTimer(t: Timer): void {
    this.pomodoroPhase.set('focus');
    this.sessionsCompleted.set(0);
    this.pomodoroRemaining.set(t.focusDuration * 60);
  }

  // ---- Mode toggle ----

  protected setMode(m: TimerMode): void {
    if (this.mode() === m) return;
    if (this.running() || this.pomodoroRunning()) return;
    this.clearInterval();
    this.running.set(false);
    this.pomodoroRunning.set(false);
    this.done.set(false);
    this.pomodoroDone.set(false);
    this.mode.set(m);

    const t = this.timer();
    if (!t) return;

    if (m === 'BASIC') {
      this.initBasicTimer(t);
    } else {
      this.initPomodoroTimer(t);
    }

    // Save timer type preference
    this.timerApi.updateTimer(t.id, { title: t.title, timerType: m }).subscribe({
      next: updated => {
        this.timer.set(updated);
      },
    });
  }

  // ---- Basic timer controls ----

  protected startBasic(): void {
    if (this.remainingSeconds() === 0) {
      this.resetBasic();
      return;
    }
    this.done.set(false);
    this.running.set(true);
    this.intervalId = setInterval(() => {
      const rem = this.remainingSeconds();
      if (rem <= 1) {
        this.remainingSeconds.set(0);
        this.clearInterval();
        this.running.set(false);
        this.done.set(true);
        this.timerSound.playChime();
      } else {
        this.remainingSeconds.set(rem - 1);
      }
    }, 1000);
  }

  protected pauseBasic(): void {
    this.running.set(false);
    this.clearInterval();
  }

  protected resetBasic(): void {
    this.clearInterval();
    this.running.set(false);
    this.done.set(false);
    const t = this.timer();
    if (t) this.remainingSeconds.set(t.basicDurationSeconds);
  }

  protected startEditDuration(): void {
    this.pauseBasic();
    this.editingDuration.set(true);
  }

  protected saveDuration(): void {
    const total = (this.editHours * 3600) + (this.editMinutes * 60) + this.editSeconds;
    if (total <= 0) return;
    this.editingDuration.set(false);
    this.remainingSeconds.set(total);
    this.done.set(false);

    const t = this.timer();
    if (!t) return;
    this.timerApi.updateTimer(t.id, { title: t.title, basicDurationSeconds: total }).subscribe({
      next: updated => this.timer.set(updated),
    });
  }

  protected cancelEditDuration(): void {
    this.editingDuration.set(false);
    const t = this.timer();
    if (t) this.initBasicTimer(t);
  }

  protected adjustHours(delta: number): void {
    this.editHours = ((this.editHours + delta) + 24) % 24;
  }

  protected adjustMinutes(delta: number): void {
    this.editMinutes = ((this.editMinutes + delta) + 60) % 60;
  }

  protected adjustSeconds(delta: number): void {
    this.editSeconds = ((this.editSeconds + delta) + 60) % 60;
  }

  protected clampHours(): void {
    this.editHours = Math.max(0, Math.min(23, Math.floor(this.editHours) || 0));
  }

  protected clampMinutes(): void {
    this.editMinutes = Math.max(0, Math.min(59, Math.floor(this.editMinutes) || 0));
  }

  protected clampSeconds(): void {
    this.editSeconds = Math.max(0, Math.min(59, Math.floor(this.editSeconds) || 0));
  }


  // ---- Pomodoro controls ----

  protected startPomodoro(): void {
    this.pomodoroDone.set(false);
    this.pomodoroRunning.set(true);
    this.intervalId = setInterval(() => {
      const rem = this.pomodoroRemaining();
      if (rem <= 1) {
        this.pomodoroRemaining.set(0);
        this.clearInterval();
        this.pomodoroRunning.set(false);
        this.timerSound.playChime();
        this.advancePomodoroPhase();
      } else {
        this.pomodoroRemaining.set(rem - 1);
      }
    }, 1000);
  }

  protected pausePomodoro(): void {
    this.pomodoroRunning.set(false);
    this.clearInterval();
  }

  protected resetPomodoro(): void {
    this.clearInterval();
    this.pomodoroRunning.set(false);
    this.pomodoroDone.set(false);
    const t = this.timer();
    if (!t) return;
    this.pomodoroPhase.set('focus');
    this.sessionsCompleted.set(0);
    this.pomodoroRemaining.set(t.focusDuration * 60);
  }

  private advancePomodoroPhase(): void {
    const t = this.timer();
    if (!t) return;

    const phase = this.pomodoroPhase();
    if (phase === 'focus') {
      const sessions = this.sessionsCompleted() + 1;
      this.sessionsCompleted.set(sessions);

      // Report focus session completed to API
      this.timerApi.updateTimer(t.id, { title: t.title, focusSessionCompleted: true }).subscribe();

      if (sessions >= t.sessionsBeforeLongBreak) {
        this.pomodoroPhase.set('long-break');
        this.pomodoroRemaining.set(t.longBreakDuration * 60);
        this.sessionsCompleted.set(0);
      } else {
        this.pomodoroPhase.set('short-break');
        this.pomodoroRemaining.set(t.shortBreakDuration * 60);
      }
    } else {
      // After break, go back to focus
      this.pomodoroPhase.set('focus');
      this.pomodoroRemaining.set(t.focusDuration * 60);
    }
    this.pomodoroDone.set(true);
  }

  protected skipPhase(): void {
    this.clearInterval();
    this.pomodoroRunning.set(false);
    this.pomodoroDone.set(false);
    this.advancePomodoroPhase();
    this.pomodoroDone.set(false);
  }

  // ---- Pomodoro settings ----

  protected savePomodoroSettings(): void {
    const t = this.timer();
    if (!t) return;
    this.timerApi.updateTimer(t.id, {
      title: t.title,
      focusDuration: t.focusDuration,
      shortBreakDuration: t.shortBreakDuration,
      longBreakDuration: t.longBreakDuration,
      sessionsBeforeLongBreak: t.sessionsBeforeLongBreak,
    }).subscribe({ next: updated => this.timer.set(updated) });
  }

  // ---- Helpers ----

  private clearInterval(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  protected formatSeconds(s: number): string {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    if (h > 0) return `${h}:${pad(m)}:${pad(sec)}`;
    return `${pad(m)}:${pad(sec)}`;
  }

  protected get pomodoroSessionDots(): boolean[] {
    const t = this.timer();
    if (!t) return [];
    const total = t.sessionsBeforeLongBreak;
    return Array.from({ length: total }, (_, i) => i < this.sessionsCompleted());
  }
}
