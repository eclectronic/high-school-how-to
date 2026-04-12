import {
  Component, ElementRef, HostListener, Input, Output, EventEmitter, OnDestroy, OnInit, signal, computed, effect, input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Timer, TaskList } from '../../core/models/task.models';
import { TimerApiService, UpdateTimerRequest, UpdateTimerResponse } from '../../core/services/timer-api.service';
import { TimerSoundService } from '../../core/services/timer-sound.service';
import { autoContrastColor, isHexColor, firstHexFromGradient, isGradient } from '../color-picker/color-utils';
import { SwatchPickerComponent } from '../swatch-picker/swatch-picker.component';
import { WidgetTitleBarComponent } from '../widget-title-bar/widget-title-bar.component';

export type TimerPhase = 'idle' | 'focus' | 'short-break' | 'long-break' | 'paused' | 'done';

export interface TimerPreset {
  name: string;
  focusDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsBeforeLongBreak: number;
}

export const TIMER_PRESETS: TimerPreset[] = [
  { name: 'Classic Pomodoro', focusDuration: 25, shortBreakDuration: 5, longBreakDuration: 15, sessionsBeforeLongBreak: 4 },
  { name: 'Short Sprint', focusDuration: 15, shortBreakDuration: 3, longBreakDuration: 10, sessionsBeforeLongBreak: 4 },
  { name: 'Deep Work', focusDuration: 50, shortBreakDuration: 10, longBreakDuration: 30, sessionsBeforeLongBreak: 3 },
];

@Component({
  selector: 'app-timer-card',
  standalone: true,
  imports: [CommonModule, FormsModule, SwatchPickerComponent, WidgetTitleBarComponent],
  host: { '[class.timer-card--elevated]': 'colorPickerOpen' },
  template: `
    <article class="timer-card"
             [style.background]="colorPreview() ?? timer.color"
             [style.color]="textColor()" (click)="$event.stopPropagation()">

      <!-- Title bar -->
      <app-widget-title-bar
        prefix="Timer: "
        [title]="timer.title"
        [minimized]="minimized"
        (titleChanged)="onTitleChanged($event)"
        (closeClicked)="deleteConfirmed()"
        (minimizeToggled)="minimized = !minimized"
      >
        <button type="button" class="title-bar-icon-btn" title="Color" aria-label="Change timer color" (click)="toggleColorPicker($event)">🌈</button>
      </app-widget-title-bar>

      <!-- Body (hidden when minimized) -->
      <ng-container *ngIf="!minimized">

      <!-- Body actions -->
      <div class="timer-card__body-actions">
        <button type="button" class="icon-btn" *ngIf="linkedList()" title="Go to linked list"
                (click)="scrollToLinkedListRequested.emit(); $event.stopPropagation()">📋</button>
<button type="button" class="icon-btn" title="Settings" (click)="toggleSettings($event)">⋯</button>
      </div>

      <!-- Color picker -->
      <div *ngIf="colorPickerOpen" class="color-picker-panel" (click)="$event.stopPropagation()" (keydown.enter)="saveColor()">
        <app-swatch-picker [selectedColor]="colorPreview() ?? timer.color" (colorChange)="onColorChange($event)" (colorCommit)="onColorCommit($event)" (escaped)="cancelColor()" />
        <div class="color-picker-actions">
          <button type="button" class="btn btn--cancel" (click)="cancelColor()">Cancel</button>
          <button type="button" class="btn btn--save" (click)="saveColor()">Save</button>
        </div>
      </div>

      <!-- Settings panel -->
      <div *ngIf="settingsOpen" class="settings-panel" (click)="$event.stopPropagation()" (keydown.escape)="cancelSettings()" (keydown.enter)="saveSettings()">
        <h4 class="settings-panel__title">Timer Settings</h4>

        <div class="settings-presets">
          <button *ngFor="let preset of presets" type="button"
                  class="preset-btn"
                  [class.preset-btn--active]="draftPresetName === preset.name"
                  (click)="applyPreset(preset)">
            {{ preset.name }}
          </button>
        </div>

        <div class="settings-grid">
          <label>Focus (min)
            <input type="number" min="1" max="120" [(ngModel)]="draftFocus" (keydown.enter)="saveSettings()" />
          </label>
          <label>Short break (min)
            <input type="number" min="1" max="60" [(ngModel)]="draftShortBreak" (keydown.enter)="saveSettings()" />
          </label>
          <label>Long break (min)
            <input type="number" min="1" max="60" [(ngModel)]="draftLongBreak" (keydown.enter)="saveSettings()" />
          </label>
          <label>Sessions
            <input type="number" min="1" max="10" [(ngModel)]="draftSessions" (keydown.enter)="saveSettings()" />
          </label>
        </div>

        <label class="settings-label">Linked to-do list
          <select [(ngModel)]="draftLinkedListId" (keydown.enter)="saveSettings()">
            <option value="">None</option>
            <option *ngFor="let list of taskLists()" [value]="list.id">{{ list.title }}</option>
          </select>
        </label>

        <div class="settings-actions">
          <button type="button" class="btn btn--cancel" (click)="cancelSettings()">Cancel</button>
          <button type="button" class="btn btn--save" (click)="saveSettings()">Save</button>
        </div>
      </div>

      <!-- Timer body: face + controls, centered vertically when widget is expanded -->
      <div class="timer-body" *ngIf="!settingsOpen && !colorPickerOpen">

        <!-- Timer face -->
        <div class="timer-face" [style.width.px]="ringSize()" [style.height.px]="ringSize()">
          <svg class="progress-ring" [class.progress-ring--done]="phase() === 'done'" viewBox="0 0 120 120">
            <circle class="progress-ring__track" cx="60" cy="60" r="52" />
            <circle class="progress-ring__fill"
                    cx="60" cy="60" r="52"
                    [attr.stroke]="ringColor()"
                    [style.stroke-dasharray]="circumference"
                    [style.stroke-dashoffset]="dashOffset()" />
          </svg>
          <div class="timer-display">
            <div *ngIf="phase() === 'done'; else timeDisplay" class="timer-display__done">🎉</div>
            <ng-template #timeDisplay>
              <div class="timer-display__time">{{ formattedTime() }}</div>
            </ng-template>
            <div class="timer-display__phase">{{ phaseLabel() }}</div>
            <div class="timer-display__session">
              <ng-container *ngIf="phase() === 'done'">All sessions complete!</ng-container>
              <ng-container *ngIf="phase() === 'short-break' || phase() === 'long-break'">Break after session {{ completedSessions }} of {{ timer.sessionsBeforeLongBreak }}</ng-container>
              <ng-container *ngIf="phase() !== 'done' && phase() !== 'short-break' && phase() !== 'long-break'">Session {{ completedSessions + 1 }} of {{ timer.sessionsBeforeLongBreak }}</ng-container>
            </div>
          </div>
        </div>

        <!-- Controls -->
        <div class="timer-controls">
          <ng-container *ngIf="phase() !== 'done'">
            <button type="button" class="ctrl-btn ctrl-btn--primary" (click)="toggleStartPause()">
              {{ phase() === 'focus' || phase() === 'short-break' || phase() === 'long-break' ? '⏸ Pause' : (phase() === 'paused' ? '▶ Resume' : '▶ Start') }}
            </button>
            <button type="button" class="ctrl-btn" (click)="skipPhase()" [disabled]="phase() === 'idle'">⏭ Skip</button>
          </ng-container>
          <button type="button" class="ctrl-btn" (click)="reset()" [disabled]="phase() === 'idle' && completedSessions === 0">↩ Reset</button>
        </div>

      </div>


      </ng-container><!-- end !minimized -->
    </article>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      position: relative;
      z-index: 1;

      &.timer-card--elevated { z-index: 20; }
    }

    .timer-card {
      font-family: var(--locker-font, var(--font-body));
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }


    .timer-card__body-actions {
      display: flex;
      gap: 0.25rem;
      justify-content: flex-end;
      padding: 0.4rem 0.75rem 0;
    }

    .title-bar-icon-btn {
      width: 1.5em;
      height: 1.5em;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      font-size: 0.85em;
      line-height: 1;
      padding: 0;
      background: rgba(255,255,255,0.5);
      border: 1px solid rgba(0,0,0,0.15);
      cursor: pointer;
      color: inherit;
      flex-shrink: 0;
      transition: opacity 0.12s, background 0.12s;
      &:hover { opacity: 0.8; background: rgba(255,255,255,0.75); }
    }

    .icon-btn {
      width: 1.8em;
      height: 1.8em;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      font-size: 1em;
      line-height: 1;
      padding: 0;
      background: rgba(255,255,255,0.7);
      border: 1px solid rgba(45,26,16,0.2);
      color: #2d1a10;
      cursor: pointer;
      transition: opacity 0.15s;
      &:hover { opacity: 0.8; }
    }

    /* Timer body — stretches to fill available height and centers content */
    .timer-body {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow-y: auto;
    }

    /* Timer face — width/height set via [style] binding from ringSize() signal */
    .timer-face {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 1;
      min-height: 0;
    }

    .progress-ring {
      width: 100%;
      height: 100%;
    }

    .progress-ring__track {
      fill: none;
      stroke: rgba(0,0,0,0.12);
      stroke-width: 8;
    }

    .progress-ring__fill {
      fill: none;
      stroke-width: 8;
      stroke-linecap: round;
      transform: rotate(-90deg);
      transform-origin: 50% 50%;
      transition: stroke-dashoffset 0.5s linear;
    }
    @keyframes ring-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .progress-ring--done .progress-ring__fill {
      animation: ring-pulse 1.6s ease-in-out infinite;
    }

    .timer-display {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      line-height: 1.2;
      width: 80%;
    }

    .timer-display__done {
      font-size: 2em;
      line-height: 1;
    }

    .timer-display__time {
      font-size: 1.6em;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }

    .timer-display__phase {
      font-size: 0.65em;
      opacity: 0.7;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .timer-display__session {
      font-size: 0.6em;
      opacity: 0.6;
    }

    /* Controls */
    .timer-controls {
      display: flex;
      gap: 0.4rem;
      justify-content: center;
      padding: 0.5rem 0.75rem;
      flex-shrink: 0;
    }

    .ctrl-btn {
      padding: 0.3rem 0.7rem;
      border-radius: 6px;
      font-family: var(--locker-font, var(--font-body));
      font-size: 0.78em;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid rgba(0,0,0,0.2);
      background: rgba(255,255,255,0.3);
      color: inherit;
      transition: opacity 0.15s;
      &:hover:not(:disabled) { opacity: 0.8; }
      &:disabled { opacity: 0.35; cursor: not-allowed; }
    }

    .ctrl-btn--primary {
      background: rgba(0,0,0,0.15);
    }

    /* Settings */
    .settings-panel {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      font-size: 0.82em;
      padding: 0 0.75rem 0.75rem;
      flex: 1;
      min-height: 0;
      overflow-y: auto;
    }

    .settings-panel__title {
      margin: 0;
      font-size: 0.85em;
      font-weight: 700;
    }

    .settings-presets {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
    }

    .preset-btn {
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.72em;
      font-family: var(--locker-font, var(--font-body));
      cursor: pointer;
      border: 1px solid rgba(0,0,0,0.2);
      background: rgba(255,255,255,0.3);
      color: inherit;
      &--active { background: rgba(0,0,0,0.15); font-weight: 700; }
    }

    .settings-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.4rem;

      label {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
        font-size: 0.72em;
        font-weight: 600;
        opacity: 0.8;
      }

      input[type=number] {
        padding: 0.2rem 0.4rem;
        border-radius: 4px;
        border: 1px solid rgba(0,0,0,0.2);
        background: rgba(255,255,255,0.5);
        font-size: 0.82em;
        color: inherit;
        width: 100%;
        box-sizing: border-box;
      }
    }

    .settings-label {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      font-size: 0.72em;
      font-weight: 600;
      opacity: 0.8;

      select {
        padding: 0.2rem 0.4rem;
        border-radius: 4px;
        border: 1px solid rgba(0,0,0,0.2);
        background: rgba(255,255,255,0.5);
        font-size: 0.82em;
        color: inherit;
      }
    }

    .settings-actions {
      display: flex;
      gap: 0.4rem;
      justify-content: flex-end;
    }

    .btn {
      padding: 0.3rem 0.8rem;
      border-radius: 6px;
      font-family: var(--locker-font, var(--font-body));
      font-size: 0.78em;
      font-weight: 600;
      cursor: pointer;
      border: none;
    }

    .btn--cancel { background: rgba(0,0,0,0.1); color: inherit; }
    .btn--save { background: rgba(0,0,0,0.2); color: inherit; }

    .color-picker-panel {
      margin: 0 0.75rem;
      background: #fffef8;
      border-radius: 8px;
      padding: 0.5rem;
    }
    .color-picker-actions {
      display: flex;
      gap: 0.4rem;
      margin-top: 0.5rem;
    }
    .color-picker-actions .btn {
      flex: 1;
      font-size: 0.8em;
      font-weight: 700;
      border-radius: 6px;
      padding: 0.3rem 0.6rem;
      border: 1px solid rgba(0,0,0,0.15);
      cursor: pointer;
      font-family: inherit;
    }
  `]
})
export class TimerCardComponent implements OnDestroy, OnInit {
  @Input({ required: true }) timer!: Timer;
  readonly taskLists = input<TaskList[]>([]);
  /** When true, the settings panel is opened on first render (used for newly-created timers). */
  readonly startInConfigMode = input<boolean>(false);
  @Output() timerUpdated = new EventEmitter<UpdateTimerResponse>();
  @Output() timerDeleted = new EventEmitter<string>();
  @Output() taskCheckChange = new EventEmitter<{ taskId: string; listId: string; completed: boolean }>();
  @Output() scrollToLinkedListRequested = new EventEmitter<void>();

  readonly presets = TIMER_PRESETS;
  readonly circumference = 2 * Math.PI * 52; // r=52

  // UI state
  protected colorPickerOpen = false;
  protected colorPreview = signal<string | null>(null);
  private colorAtOpen = '';
  protected settingsOpen = false;
  protected minimized = false;

  // Settings drafts
  protected draftFocus = 25;
  protected draftShortBreak = 5;
  protected draftLongBreak = 15;
  protected draftSessions = 4;
  protected draftLinkedListId = '';
  protected draftPresetName: string | null = null;

  // Ring size — updated by ResizeObserver so the ring scales with the widget's pixel width
  protected ringSize = signal(120);
  private ringResizeObserver = new ResizeObserver(([entry]) => {
    const w = entry.contentRect.width;
    this.ringSize.set(Math.max(90, Math.round(w * 0.42)));
  });

  // Timer state
  protected phase = signal<TimerPhase>('idle');
  protected secondsRemaining = signal(0);
  protected completedSessions = 0;
  private tickInterval: ReturnType<typeof setInterval> | null = null;

  protected textColor = computed(() => {
    const color = this.colorPreview() ?? this.timer.color;
    const hex = isGradient(color) ? (firstHexFromGradient(color) ?? '#fffef8') : color;
    return isHexColor(hex) ? autoContrastColor(hex) : '#2d1a10';
  });

  protected formattedTime = computed(() => {
    const s = this.secondsRemaining();
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  });

  protected phaseLabel = computed(() => {
    const p = this.phase();
    if (p === 'focus') return 'Focus';
    if (p === 'short-break') return 'Short Break';
    if (p === 'long-break') return 'Long Break';
    if (p === 'paused') return 'Paused';
    if (p === 'done') return 'Complete!';
    return 'Ready';
  });

  protected ringColor = computed(() => {
    const p = this.phase();
    if (p === 'focus') return '#ef4444';
    if (p === 'short-break' || p === 'long-break') return '#22c55e';
    if (p === 'done') return '#f59e0b';
    return 'rgba(0,0,0,0.2)';
  });

  protected dashOffset = computed(() => {
    const p = this.phase();
    if (p === 'idle') return this.circumference;
    if (p === 'done') return 0;
    const total = this.totalSecondsForPhase(p === 'paused' ? this.pausedPhase : p);
    if (total === 0) return 0;
    return this.circumference * (1 - this.secondsRemaining() / total);
  });

  protected linkedList = computed(() => {
    if (!this.timer.linkedTaskListId) return null;
    return this.taskLists().find(l => l.id === this.timer.linkedTaskListId) ?? null;
  });

  protected allLinkedTasksDone = computed(() => {
    const list = this.linkedList();
    return !!list && list.tasks.length > 0 && list.tasks.every(t => t.completed);
  });

  private pausedPhase: TimerPhase = 'focus';

  constructor(private timerApi: TimerApiService, private hostEl: ElementRef<HTMLElement>, private sound: TimerSoundService) {
    effect(() => {
      const s = this.secondsRemaining();
      if (s === 0 && (this.phase() === 'focus' || this.phase() === 'short-break' || this.phase() === 'long-break')) {
        this.onPhaseComplete();
      }
    });
    effect(() => {
      if (this.allLinkedTasksDone() && this.phase() !== 'idle' && this.phase() !== 'done') {
        this.clearTick();
        this.sound.playChime();
        this.sendNotification('All tasks complete!', 'Great work!');
        this.phase.set('done');
      }
    });
  }

  ngOnInit(): void {
    this.ringResizeObserver.observe(this.hostEl.nativeElement);
    if (this.startInConfigMode()) {
      this.draftFocus = this.timer.focusDuration;
      this.draftShortBreak = this.timer.shortBreakDuration;
      this.draftLongBreak = this.timer.longBreakDuration;
      this.draftSessions = this.timer.sessionsBeforeLongBreak;
      this.draftLinkedListId = this.timer.linkedTaskListId ?? '';
      this.draftPresetName = this.timer.presetName ?? null;
      this.settingsOpen = true;
    }
  }

  ngOnDestroy(): void {
    this.ringResizeObserver.disconnect();
    this.clearTick();
  }

  protected toggleStartPause(): void {
    const p = this.phase();
    if (p === 'done') return;
    if (p === 'idle') {
      this.startFocus();
    } else if (p === 'focus' || p === 'short-break' || p === 'long-break') {
      this.pausedPhase = p;
      this.phase.set('paused');
      this.clearTick();
    } else if (p === 'paused') {
      this.phase.set(this.pausedPhase);
      this.startTick();
    }
  }

  protected reset(): void {
    this.clearTick();
    this.phase.set('idle');
    this.secondsRemaining.set(0);
    this.completedSessions = 0;
  }

  protected skipPhase(): void {
    this.clearTick();
    const p = this.phase();
    if (p === 'focus') {
      this.completedSessions++;
      this.reportSessionEvent({ focusSessionCompleted: true });
      this.startBreak();
    } else if (p === 'short-break') {
      this.startFocus();
    } else if (p === 'long-break') {
      this.reportSessionEvent({});
      this.phase.set('done');
    } else if (p === 'paused') {
      if (this.pausedPhase === 'focus') {
        this.completedSessions++;
        this.reportSessionEvent({ focusSessionCompleted: true });
        this.startBreak();
      } else if (this.pausedPhase === 'long-break') {
        this.reportSessionEvent({});
        this.phase.set('done');
      } else {
        this.startFocus();
      }
    }
  }

  protected toggleColorPicker(event: Event): void {
    event.stopPropagation();
    this.colorPickerOpen = !this.colorPickerOpen;
    this.settingsOpen = false;
    if (this.colorPickerOpen) {
      this.colorAtOpen = this.timer.color;
      this.colorPreview.set(null);
    }
  }

  protected toggleSettings(event: Event): void {
    event.stopPropagation();
    this.settingsOpen = !this.settingsOpen;
    if (this.settingsOpen) {
      this.colorPickerOpen = false;
      this.draftFocus = this.timer.focusDuration;
      this.draftShortBreak = this.timer.shortBreakDuration;
      this.draftLongBreak = this.timer.longBreakDuration;
      this.draftSessions = this.timer.sessionsBeforeLongBreak;
      this.draftLinkedListId = this.timer.linkedTaskListId ?? '';
      this.draftPresetName = this.timer.presetName ?? null;
    }
  }

  protected applyPreset(preset: TimerPreset): void {
    this.draftFocus = preset.focusDuration;
    this.draftShortBreak = preset.shortBreakDuration;
    this.draftLongBreak = preset.longBreakDuration;
    this.draftSessions = preset.sessionsBeforeLongBreak;
    this.draftPresetName = preset.name;
  }

  protected saveSettings(): void {
    const linkedList = this.draftLinkedListId
      ? this.taskLists().find(l => l.id === this.draftLinkedListId)
      : null;
    const req: UpdateTimerRequest = {
      title: this.timer.title,
      color: linkedList ? linkedList.color : this.timer.color,
      textColor: linkedList ? linkedList.textColor : this.timer.textColor,
      focusDuration: this.draftFocus,
      shortBreakDuration: this.draftShortBreak,
      longBreakDuration: this.draftLongBreak,
      sessionsBeforeLongBreak: this.draftSessions,
      linkedTaskListId: this.draftLinkedListId || null,
      clearLinkedTaskList: !this.draftLinkedListId,
    };
    // Find preset name if matching
    const match = TIMER_PRESETS.find(p =>
      p.focusDuration === this.draftFocus &&
      p.shortBreakDuration === this.draftShortBreak &&
      p.longBreakDuration === this.draftLongBreak &&
      p.sessionsBeforeLongBreak === this.draftSessions
    );
    req.presetName = match?.name ?? null;

    this.timerApi.updateTimer(this.timer.id, req).subscribe(updated => {
      this.timerUpdated.emit(updated);
      this.settingsOpen = false;
      if (this.phase() !== 'idle') {
        this.reset();
      }
      localStorage.setItem('hsht_pomodoroDefault', JSON.stringify({
        focusDuration: this.draftFocus,
        shortBreakDuration: this.draftShortBreak,
        longBreakDuration: this.draftLongBreak,
        sessionsBeforeLongBreak: this.draftSessions,
        presetName: req.presetName ?? null,
      }));
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.colorPickerOpen) { this.cancelColor(); return; }
    if (this.settingsOpen) this.cancelSettings();
  }

  protected cancelSettings(): void {
    this.settingsOpen = false;
  }

  protected onColorChange(color: string): void {
    this.colorPreview.set(color);
  }

  protected onColorCommit(color: string): void {
    this.colorPreview.set(color);
    this.saveColor();
  }

  protected saveColor(): void {
    const color = this.colorPreview() ?? this.timer.color;
    this.colorPickerOpen = false;
    this.colorPreview.set(null);
    const req: UpdateTimerRequest = {
      title: this.timer.title,
      color,
      textColor: null,
      linkedTaskListId: this.timer.linkedTaskListId ?? null,
      clearLinkedTaskList: false,
    };
    this.timerApi.updateTimer(this.timer.id, req).subscribe(updated => {
      this.timerUpdated.emit(updated);
      localStorage.setItem('hsht_timerColorDefault', color);
    });
  }

  protected cancelColor(): void {
    this.colorPickerOpen = false;
    this.colorPreview.set(null);
  }

  protected onTitleChanged(title: string): void {
    const req: UpdateTimerRequest = { title, color: this.timer.color };
    this.timerApi.updateTimer(this.timer.id, req).subscribe(updated => this.timerUpdated.emit(updated));
  }

  protected deleteConfirmed(): void {
    this.timerApi.deleteTimer(this.timer.id).subscribe(() => {
      this.clearTick();
      this.timerDeleted.emit(this.timer.id);
    });
  }

  private startFocus(): void {
    this.secondsRemaining.set(this.timer.focusDuration * 60);
    this.phase.set('focus');
    this.startTick();
    this.requestNotificationPermission();
  }

  private startBreak(): void {
    const isLong = this.completedSessions > 0 && this.completedSessions % this.timer.sessionsBeforeLongBreak === 0;
    if (isLong) {
      this.secondsRemaining.set(this.timer.longBreakDuration * 60);
      this.phase.set('long-break');
    } else {
      this.secondsRemaining.set(this.timer.shortBreakDuration * 60);
      this.phase.set('short-break');
    }
    this.startTick();
  }

  private onPhaseComplete(): void {
    this.clearTick();
    this.sound.playChime();
    const p = this.phase();
    if (p === 'focus') {
      this.sendNotification('Focus session complete!', 'Time for a break.');
      this.completedSessions++;
      this.reportSessionEvent({ focusSessionCompleted: true });
      this.phase.set('idle');
      this.startBreak();
    } else if (p === 'short-break') {
      this.sendNotification('Break over!', 'Ready to focus?');
      this.phase.set('idle');
    } else if (p === 'long-break') {
      this.sendNotification('Cycle complete!', 'Great work — take a rest.');
      this.reportSessionEvent({});
      this.phase.set('done');
    }
  }

  private reportSessionEvent(flags: { focusSessionCompleted?: boolean }): void {
    const req: UpdateTimerRequest = {
      title: this.timer.title,
      color: this.timer.color,
      linkedTaskListId: this.timer.linkedTaskListId ?? null,
      clearLinkedTaskList: false,
      ...flags,
    };
    this.timerApi.updateTimer(this.timer.id, req).subscribe(updated => {
      this.timerUpdated.emit(updated);
    });
  }

  private startTick(): void {
    this.clearTick();
    this.tickInterval = setInterval(() => {
      const s = this.secondsRemaining();
      if (s > 0) {
        this.secondsRemaining.set(s - 1);
      }
    }, 1000);
  }

  private clearTick(): void {
    if (this.tickInterval !== null) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  private totalSecondsForPhase(p: TimerPhase): number {
    if (p === 'focus') return this.timer.focusDuration * 60;
    if (p === 'short-break') return this.timer.shortBreakDuration * 60;
    if (p === 'long-break') return this.timer.longBreakDuration * 60;
    return this.timer.focusDuration * 60;
  }

  private requestNotificationPermission(): void {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  private sendNotification(title: string, body: string): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/assets/images/logo.png' });
    }
  }
}
