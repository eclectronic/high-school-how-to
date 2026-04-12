import {
  Component,
  HostListener,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  signal,
  computed,
  effect,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Timer } from '../../core/models/task.models';
import { TimerApiService, UpdateTimerRequest, UpdateTimerResponse } from '../../core/services/timer-api.service';
import { TimerSoundService } from '../../core/services/timer-sound.service';
import {
  autoContrastColor,
  isHexColor,
  firstHexFromGradient,
  isGradient,
} from '../color-picker/color-utils';
import { SwatchPickerComponent } from '../swatch-picker/swatch-picker.component';
import { WidgetTitleBarComponent } from '../widget-title-bar/widget-title-bar.component';

export type BasicTimerState = 'config' | 'idle' | 'running' | 'paused' | 'done';

/**
 * Plain countdown timer widget (iOS Clock-app style). Distinct from the
 * Pomodoro TimerCardComponent: a single configurable duration that rings
 * when it hits zero, with no cycles or breaks.
 */
@Component({
  selector: 'app-basic-timer-card',
  standalone: true,
  imports: [CommonModule, FormsModule, SwatchPickerComponent, WidgetTitleBarComponent],
  host: { '[class.timer-card--elevated]': 'colorPickerOpen' },
  template: `
    <article
      class="timer-card"
      [style.background]="colorPreview() ?? timer.color"
      [style.color]="textColor()"
      (click)="$event.stopPropagation()"
    >
      <app-widget-title-bar
        title="Basic Timer"
        [editable]="false"
        [minimized]="minimized"
        (closeClicked)="deleteConfirmed()"
        (minimizeToggled)="minimized = !minimized"
      >
        <button type="button" class="title-bar-icon-btn" title="Color" aria-label="Change timer color" (click)="toggleColorPicker($event)">🌈</button>
      </app-widget-title-bar>

      <ng-container *ngIf="!minimized">
        <!-- Body actions -->
        <div class="timer-card__body-actions">
          <button type="button" class="icon-btn" title="Edit duration" (click)="enterConfig($event)">⋯</button>
        </div>

        <!-- Color picker -->
        <div *ngIf="colorPickerOpen" class="color-picker-panel" (click)="$event.stopPropagation()" (keydown.enter)="saveColor()">
          <app-swatch-picker [selectedColor]="colorPreview() ?? timer.color" (colorChange)="onColorChange($event)" (colorCommit)="onColorCommit($event)" (escaped)="cancelColor()" />
          <div class="color-picker-actions">
            <button type="button" class="btn btn--cancel" (click)="cancelColor()">Cancel</button>
            <button type="button" class="btn btn--save" (click)="saveColor()">Save</button>
          </div>
        </div>

        <!-- Config (duration picker) -->
        <div *ngIf="state() === 'config' && !colorPickerOpen" class="config-panel" (keydown.escape)="cancelConfig()" (keydown.enter)="saveConfig()">
          <h4 class="config-panel__title">Set Duration</h4>
          <div class="config-picker">
            <div class="spinner">
              <span class="config-picker__label">hrs</span>
              <button type="button" class="spinner__btn" (click)="stepHours(1)" aria-label="Increase hours">▲</button>
              <input
                type="number"
                min="0"
                max="23"
                [(ngModel)]="draftHours"
                (keydown.enter)="saveConfig()"
              />
              <button type="button" class="spinner__btn" (click)="stepHours(-1)" aria-label="Decrease hours">▼</button>
            </div>
            <span class="config-picker__sep">:</span>
            <div class="spinner">
              <span class="config-picker__label">min</span>
              <button type="button" class="spinner__btn" (click)="stepMinutes(1)" aria-label="Increase minutes">▲</button>
              <input
                type="number"
                min="0"
                max="59"
                [(ngModel)]="draftMinutes"
                (keydown.enter)="saveConfig()"
              />
              <button type="button" class="spinner__btn" (click)="stepMinutes(-1)" aria-label="Decrease minutes">▼</button>
            </div>
            <span class="config-picker__sep">:</span>
            <div class="spinner">
              <span class="config-picker__label">sec</span>
              <button type="button" class="spinner__btn" (click)="stepSeconds(10)" aria-label="Increase seconds by 10">▲</button>
              <input
                type="number"
                min="0"
                max="59"
                step="10"
                [(ngModel)]="draftSeconds"
                (keydown.enter)="saveConfig()"
              />
              <button type="button" class="spinner__btn" (click)="stepSeconds(-10)" aria-label="Decrease seconds by 10">▼</button>
            </div>
          </div>
          <div class="config-presets">
            <button type="button" class="preset-btn" (click)="applyPreset(60)">1 min</button>
            <button type="button" class="preset-btn" (click)="applyPreset(300)">5 min</button>
            <button type="button" class="preset-btn" (click)="applyPreset(600)">10 min</button>
            <button type="button" class="preset-btn" (click)="applyPreset(1800)">30 min</button>
          </div>
          <div class="config-actions">
            <button
              type="button"
              class="btn btn--cancel"
              *ngIf="hasInitialDuration"
              (click)="cancelConfig()"
            >
              Cancel
            </button>
            <button
              type="button"
              class="btn btn--save"
              [disabled]="!draftDurationValid()"
              (click)="saveConfig()"
            >
              Save
            </button>
          </div>
        </div>

        <!-- Running / idle / done display -->
        <div *ngIf="state() !== 'config' && !colorPickerOpen" class="timer-body">
          <div class="timer-face">
            <svg
              class="progress-ring"
              [class.progress-ring--done]="state() === 'done'"
              viewBox="0 0 120 120"
            >
              <circle class="progress-ring__track" cx="60" cy="60" r="52" />
              <circle
                class="progress-ring__fill"
                cx="60"
                cy="60"
                r="52"
                [attr.stroke]="ringColor()"
                [style.stroke-dasharray]="circumference"
                [style.stroke-dashoffset]="dashOffset()"
              />
            </svg>
            <div class="timer-display">
              <div *ngIf="state() === 'done'; else timeDisplay" class="timer-display__done">🔔</div>
              <ng-template #timeDisplay>
                <div class="timer-display__time">{{ formattedTime() }}</div>
              </ng-template>
              <div class="timer-display__phase">{{ stateLabel() }}</div>
            </div>
          </div>

          <div class="timer-controls">
            <ng-container *ngIf="state() === 'idle'">
              <button type="button" class="ctrl-btn ctrl-btn--primary" (click)="start()">
                ▶ Start
              </button>
            </ng-container>
            <ng-container *ngIf="state() === 'running'">
              <button type="button" class="ctrl-btn ctrl-btn--primary" (click)="pause()">
                ⏸ Pause
              </button>
              <button type="button" class="ctrl-btn" (click)="reset()">↩ Reset</button>
            </ng-container>
            <ng-container *ngIf="state() === 'paused'">
              <button type="button" class="ctrl-btn ctrl-btn--primary" (click)="resume()">
                ▶ Resume
              </button>
              <button type="button" class="ctrl-btn" (click)="reset()">↩ Reset</button>
            </ng-container>
            <ng-container *ngIf="state() === 'done'">
              <button type="button" class="ctrl-btn ctrl-btn--primary" (click)="reset()">
                ↩ Reset
              </button>
            </ng-container>
          </div>
        </div>
      </ng-container>
    </article>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        position: relative;
        z-index: 1;

        &.timer-card--elevated {
          z-index: 20;
        }
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
        background: rgba(255, 255, 255, 0.7);
        border: 1px solid rgba(45, 26, 16, 0.2);
        color: #2d1a10;
        cursor: pointer;
        transition: opacity 0.15s;
        &:hover {
          opacity: 0.8;
        }
      }

      .timer-body {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }

      .timer-face {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 0.75rem;
      }

      .progress-ring {
        width: 7.5em;
        height: 7.5em;
      }

      .progress-ring__track {
        fill: none;
        stroke: rgba(0, 0, 0, 0.12);
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
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }

      .progress-ring--done .progress-ring__fill {
        animation: ring-pulse 1.6s ease-in-out infinite;
      }

      .timer-display {
        position: absolute;
        text-align: center;
        line-height: 1.2;
      }

      .timer-display__done {
        font-size: 2em;
        line-height: 1;
      }

      .timer-display__time {
        font-size: 1.5em;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }

      .timer-display__phase {
        font-size: var(--locker-body-font-size, 0.65rem);
        opacity: 0.7;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .timer-controls {
        display: flex;
        gap: 0.4rem;
        justify-content: center;
        padding: 0.5rem 0.75rem 0.75rem;
      }

      .ctrl-btn {
        padding: 0.3rem 0.7rem;
        border-radius: 6px;
        font-family: var(--locker-font, var(--font-body));
        font-size: 0.78em;
        font-weight: 600;
        cursor: pointer;
        border: 1px solid rgba(0, 0, 0, 0.2);
        background: rgba(255, 255, 255, 0.3);
        color: inherit;
        transition: opacity 0.15s;
        &:hover:not(:disabled) {
          opacity: 0.8;
        }
        &:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
      }

      .ctrl-btn--primary {
        background: rgba(0, 0, 0, 0.15);
      }

      /* Config panel */
      .config-panel {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem;
      }

      .config-panel__title {
        margin: 0;
        font-size: 0.9em;
        font-weight: 700;
      }

      .config-picker {
        display: flex;
        align-items: center;
        gap: 0.2rem;
      }

      .spinner {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.15rem;

        input[type='number'] {
          width: 2.8em;
          padding: 0.25rem 0.3rem;
          border-radius: 6px;
          border: 1px solid rgba(0, 0, 0, 0.2);
          background: rgba(255, 255, 255, 0.6);
          font-size: 1.2em;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          text-align: center;
          color: inherit;
          -moz-appearance: textfield;
          appearance: textfield;
          font-family: inherit;
        }
        input[type='number']::-webkit-outer-spin-button,
        input[type='number']::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
      }

      .spinner__btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2.8em;
        height: 1.25em;
        background: rgba(255, 255, 255, 0.45);
        border: 1px solid rgba(0, 0, 0, 0.18);
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.58em;
        line-height: 1;
        padding: 0;
        color: inherit;
        font-family: inherit;
        transition: background 0.1s;
        &:hover {
          background: rgba(255, 255, 255, 0.85);
        }
        &:active {
          background: rgba(0, 0, 0, 0.08);
        }
      }

      .config-picker__label {
        font-size: 0.6em;
        opacity: 0.6;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .config-picker__sep {
        font-size: 1.2em;
        font-weight: 700;
        opacity: 0.6;
        margin-top: 1.6em; /* nudge down past the label row */
      }

      .config-presets {
        display: flex;
        flex-wrap: wrap;
        gap: 0.3rem;
        justify-content: center;
      }

      .preset-btn {
        padding: 0.2rem 0.55rem;
        border-radius: 4px;
        font-size: 0.72em;
        font-family: var(--locker-font, var(--font-body));
        cursor: pointer;
        border: 1px solid rgba(0, 0, 0, 0.2);
        background: rgba(255, 255, 255, 0.3);
        color: inherit;
        &:hover {
          opacity: 0.8;
        }
      }

      .config-actions {
        display: flex;
        gap: 0.4rem;
      }

      .btn {
        padding: 0.3rem 0.8rem;
        border-radius: 6px;
        font-family: var(--locker-font, var(--font-body));
        font-size: 0.78em;
        font-weight: 600;
        cursor: pointer;
        border: none;
        &:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      }

      .btn--cancel {
        background: rgba(0, 0, 0, 0.1);
        color: inherit;
      }
      .btn--save {
        background: rgba(0, 0, 0, 0.2);
        color: inherit;
      }

      .color-picker-panel {
        margin: 0 0.75rem 0.75rem;
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
    `,
  ],
})
export class BasicTimerCardComponent implements OnInit, OnDestroy {
  @Input({ required: true }) timer!: Timer;
  /** If true, the widget opens in config mode on init (used for freshly created timers). */
  readonly startInConfigMode = input<boolean>(false);

  @Output() timerUpdated = new EventEmitter<UpdateTimerResponse>();
  @Output() timerDeleted = new EventEmitter<string>();

  readonly circumference = 2 * Math.PI * 52;

  // UI state
  protected colorPickerOpen = false;
  protected colorPreview = signal<string | null>(null);
  private colorAtOpen = '';
  protected minimized = false;

  // Config drafts (hours / minutes / seconds)
  protected draftHours = 0;
  protected draftMinutes = 5;
  protected draftSeconds = 0;

  // Timer state
  protected state = signal<BasicTimerState>('idle');
  protected secondsRemaining = signal(0);
  private tickInterval: ReturnType<typeof setInterval> | null = null;

  protected textColor = computed(() => {
    const color = this.colorPreview() ?? this.timer.color;
    const hex = isGradient(color) ? firstHexFromGradient(color) ?? '#fffef8' : color;
    return isHexColor(hex) ? autoContrastColor(hex) : '#2d1a10';
  });

  protected formattedTime = computed(() => {
    const s = Math.max(0, this.secondsRemaining());
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  });

  protected stateLabel = computed(() => {
    const s = this.state();
    if (s === 'running') return 'Running';
    if (s === 'paused') return 'Paused';
    if (s === 'done') return 'Time’s Up!';
    return 'Ready';
  });

  protected ringColor = computed(() => {
    const s = this.state();
    if (s === 'running') return '#2563eb';
    if (s === 'paused') return '#f59e0b';
    if (s === 'done') return '#ef4444';
    return 'rgba(0,0,0,0.2)';
  });

  protected dashOffset = computed(() => {
    const s = this.state();
    if (s === 'idle' || s === 'config') return this.circumference;
    if (s === 'done') return 0;
    const total = this.timer.basicDurationSeconds;
    if (total === 0) return 0;
    return this.circumference * (1 - this.secondsRemaining() / total);
  });

  protected draftDurationValid = computed(
    () => this.draftTotalSeconds() >= 1 && this.draftTotalSeconds() <= 86400,
  );

  /** True if this widget already has a configured duration (i.e. not a brand-new timer). */
  protected get hasInitialDuration(): boolean {
    return this.timer.basicDurationSeconds > 0 && !this.startInConfigMode();
  }

  constructor(private timerApi: TimerApiService, private sound: TimerSoundService) {
    effect(() => {
      const s = this.secondsRemaining();
      if (s <= 0 && this.state() === 'running') {
        this.onCountdownComplete();
      }
    });
  }

  ngOnInit(): void {
    this.secondsRemaining.set(this.timer.basicDurationSeconds);
    this.loadDraftFromTimer();
    if (this.startInConfigMode()) {
      this.state.set('config');
    }
  }

  ngOnDestroy(): void {
    this.clearTick();
  }

  protected start(): void {
    if (this.timer.basicDurationSeconds <= 0) {
      this.enterConfig();
      return;
    }
    this.secondsRemaining.set(this.timer.basicDurationSeconds);
    this.state.set('running');
    this.startTick();
    this.requestNotificationPermission();
  }

  protected pause(): void {
    if (this.state() !== 'running') return;
    this.state.set('paused');
    this.clearTick();
  }

  protected resume(): void {
    if (this.state() !== 'paused') return;
    this.state.set('running');
    this.startTick();
  }

  protected reset(): void {
    this.clearTick();
    this.secondsRemaining.set(this.timer.basicDurationSeconds);
    this.state.set('idle');
  }

  protected enterConfig(event?: Event): void {
    event?.stopPropagation();
    this.clearTick();
    this.colorPickerOpen = false;
    this.loadDraftFromTimer();
    this.state.set('config');
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.colorPickerOpen) { this.cancelColor(); return; }
    if (this.state() === 'config') this.cancelConfig();
  }

  @HostListener('document:keydown.enter', ['$event'])
  onEnter(event: Event): void {
    if (this.state() === 'config' && !this.colorPickerOpen) {
      event.preventDefault();
      this.saveConfig();
    }
  }

  protected cancelConfig(): void {
    this.loadDraftFromTimer();
    this.state.set('idle');
  }

  protected stepHours(delta: number): void {
    this.draftHours = Math.max(0, Math.min(23, (this.draftHours || 0) + delta));
  }

  protected stepMinutes(delta: number): void {
    this.draftMinutes = Math.max(0, Math.min(59, (this.draftMinutes || 0) + delta));
  }

  protected stepSeconds(delta: number): void {
    // Snaps to multiples of 10, wraps within 0–50
    const snapped = Math.round((this.draftSeconds || 0) / 10) * 10;
    let next = snapped + delta;
    if (next > 50) next = 0;
    if (next < 0) next = 50;
    this.draftSeconds = next;
  }

  protected applyPreset(seconds: number): void {
    this.draftHours = Math.floor(seconds / 3600);
    this.draftMinutes = Math.floor((seconds % 3600) / 60);
    this.draftSeconds = seconds % 60;
  }

  protected saveConfig(): void {
    if (!this.draftDurationValid()) return;
    const totalSeconds = this.draftTotalSeconds();
    const req: UpdateTimerRequest = {
      title: this.timer.title,
      color: this.timer.color,
      textColor: this.timer.textColor ?? null,
      timerType: 'BASIC',
      basicDurationSeconds: totalSeconds,
    };
    this.timerApi.updateTimer(this.timer.id, req).subscribe({
      next: (updated) => {
        this.timerUpdated.emit(updated);
        this.secondsRemaining.set(totalSeconds);
        this.state.set('idle');
        localStorage.setItem('hsht_basicTimerDefault', String(totalSeconds));
      },
    });
  }

  protected toggleColorPicker(event: Event): void {
    event.stopPropagation();
    this.colorPickerOpen = !this.colorPickerOpen;
    if (this.colorPickerOpen) {
      this.colorAtOpen = this.timer.color;
      this.colorPreview.set(null);
    }
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
    };
    this.timerApi.updateTimer(this.timer.id, req).subscribe({
      next: (updated) => {
        this.timerUpdated.emit(updated);
        localStorage.setItem('hsht_timerColorDefault', color);
      },
    });
  }

  protected cancelColor(): void {
    this.colorPickerOpen = false;
    this.colorPreview.set(null);
  }

  protected deleteConfirmed(): void {
    this.timerApi.deleteTimer(this.timer.id).subscribe(() => {
      this.clearTick();
      this.timerDeleted.emit(this.timer.id);
    });
  }

  private onCountdownComplete(): void {
    this.clearTick();
    this.state.set('done');
    this.sound.playChime();
    this.sendNotification('Timer done!', this.timer.title);
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

  private draftTotalSeconds(): number {
    const h = Math.max(0, Math.floor(this.draftHours || 0));
    const m = Math.max(0, Math.floor(this.draftMinutes || 0));
    const s = Math.max(0, Math.floor(this.draftSeconds || 0));
    return h * 3600 + m * 60 + s;
  }

  private loadDraftFromTimer(): void {
    const total = this.timer.basicDurationSeconds || 300;
    this.draftHours = Math.floor(total / 3600);
    this.draftMinutes = Math.floor((total % 3600) / 60);
    this.draftSeconds = total % 60;
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
