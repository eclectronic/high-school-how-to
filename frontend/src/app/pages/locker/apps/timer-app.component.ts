import { Component, Input, OnInit, OnDestroy, signal, computed, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimerApiService } from '../../../core/services/timer-api.service';
import { TimerSoundService } from '../../../core/services/timer-sound.service';
import { Timer } from '../../../core/models/task.models';

type TimerMode = 'BASIC' | 'POMODORO';
type PomodoroPhase = 'focus' | 'short-break' | 'long-break';

const POMODORO_PRESETS: { name: string; focus: number; shortBreak: number; longBreak: number; sessions: number }[] = [
  { name: 'Classic', focus: 25, shortBreak: 5, longBreak: 15, sessions: 4 },
  { name: 'Short Sprint', focus: 15, shortBreak: 3, longBreak: 10, sessions: 4 },
  { name: 'Deep Work', focus: 50, shortBreak: 10, longBreak: 30, sessions: 3 },
];

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

  // Basic timer edit fields — hours folded into minutes (0–99)
  protected editMinutes = 25;
  protected editSeconds = 0;
  protected editingDuration = signal(false);
  private editingFromRemaining = 0;

  // Pomodoro state
  protected pomodoroPhase = signal<PomodoroPhase>('focus');
  protected sessionsCompleted = signal(0);
  protected pomodoroRemaining = signal(0);
  protected pomodoroRunning = signal(false);
  protected pomodoroDone = signal(false);
  protected showPomodoroSettings = signal(false);
  protected readonly pomodoroPresets = POMODORO_PRESETS;

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
    this.editMinutes = Math.floor(total / 60);
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
    if (this.running()) return;
    this.editingFromRemaining = this.remainingSeconds();
    const total = this.timer()?.basicDurationSeconds ?? this.remainingSeconds();
    this.editMinutes = Math.floor(total / 60);
    this.editSeconds = total % 60;
    this.editingDuration.set(true);
  }

  protected saveDuration(): void {
    const total = (this.editMinutes * 60) + this.editSeconds;
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
    this.remainingSeconds.set(this.editingFromRemaining);
  }

  protected adjustMinutes(delta: number): void {
    this.editMinutes = Math.max(0, Math.min(99, this.editMinutes + delta));
  }

  protected adjustSeconds(delta: number): void {
    this.editSeconds = ((this.editSeconds + delta) + 60) % 60;
  }

  protected clampMinutes(): void {
    this.editMinutes = Math.max(0, Math.min(99, Math.floor(this.editMinutes) || 0));
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

  protected openPomodoroSettings(): void {
    if (!this.pomodoroRunning()) {
      this.showPomodoroSettings.set(true);
    }
  }

  private static readonly CUSTOM_SETTINGS_KEY = 'pomo-custom-settings';

  protected saveCustomSettingsToStorage(t: Timer): void {
    if (t.presetName) return; // only snapshot when currently on custom
    localStorage.setItem(TimerAppComponent.CUSTOM_SETTINGS_KEY, JSON.stringify({
      focusDuration: t.focusDuration,
      shortBreakDuration: t.shortBreakDuration,
      longBreakDuration: t.longBreakDuration,
      sessionsBeforeLongBreak: t.sessionsBeforeLongBreak,
    }));
  }

  protected onPresetSelectChange(name: string): void {
    const t = this.timer();
    if (!t) return;
    const preset = this.pomodoroPresets.find(p => p.name === name);
    if (preset) {
      this.saveCustomSettingsToStorage(t);
      this.applyPreset(preset);
    } else {
      this.restoreCustomSettings();
    }
  }

  private restoreCustomSettings(): void {
    const t = this.timer();
    if (!t) return;
    const raw = localStorage.getItem(TimerAppComponent.CUSTOM_SETTINGS_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      t.focusDuration = saved.focusDuration ?? t.focusDuration;
      t.shortBreakDuration = saved.shortBreakDuration ?? t.shortBreakDuration;
      t.longBreakDuration = saved.longBreakDuration ?? t.longBreakDuration;
      t.sessionsBeforeLongBreak = saved.sessionsBeforeLongBreak ?? t.sessionsBeforeLongBreak;
      t.presetName = undefined;
      this.savePomodoroSettings();
      this.initPomodoroTimer(t);
    } catch {
      // corrupted storage — ignore
    }
  }

  protected applyPreset(preset: typeof POMODORO_PRESETS[0]): void {
    const t = this.timer();
    if (!t) return;
    t.focusDuration = preset.focus;
    t.shortBreakDuration = preset.shortBreak;
    t.longBreakDuration = preset.longBreak;
    t.sessionsBeforeLongBreak = preset.sessions;
    t.presetName = preset.name;
    this.savePomodoroSettings();
    this.initPomodoroTimer(t);
  }

  protected clearPresetName(): void {
    const t = this.timer();
    if (t) t.presetName = undefined;
  }

  protected savePomodoroSettings(): void {
    const t = this.timer();
    if (!t) return;
    this.timerApi.updateTimer(t.id, {
      title: t.title,
      focusDuration: t.focusDuration,
      shortBreakDuration: t.shortBreakDuration,
      longBreakDuration: t.longBreakDuration,
      sessionsBeforeLongBreak: t.sessionsBeforeLongBreak,
      presetName: t.presetName ?? null,
    }).subscribe({ next: updated => this.timer.set(updated) });
  }

  protected savePomodoroSettingsAndClose(): void {
    this.savePomodoroSettings();
    this.showPomodoroSettings.set(false);
  }

  protected closePomodoroSettings(): void {
    this.showPomodoroSettings.set(false);
  }

  @HostListener('keydown.enter', ['$event'])
  onEnter(event: Event): void {
    const el = event.target as HTMLElement;
    const tag = el.tagName;

    if (this.mode() === 'BASIC') {
      if (tag === 'INPUT' || tag === 'BUTTON' || tag === 'TEXTAREA') return;
      if (this.editingDuration()) this.saveDuration();
      else if (!this.running()) this.startBasic();
    } else {
      if (this.showPomodoroSettings()) {
        if (tag === 'INPUT' || tag === 'TEXTAREA') return; // inputs handle themselves
        if (el.classList.contains('btn--cancel')) return;  // cancel handles itself
        this.savePomodoroSettingsAndClose();
      } else {
        if (tag === 'INPUT' || tag === 'BUTTON' || tag === 'TEXTAREA') return;
        if (!this.pomodoroRunning()) this.startPomodoro();
      }
    }
  }

  @HostListener('keydown.escape')
  onEscape(): void {
    if (this.editingDuration()) this.cancelEditDuration();
    if (this.showPomodoroSettings()) this.closePomodoroSettings();
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
