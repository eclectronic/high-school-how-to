import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { forkJoin } from 'rxjs';
import { TaskApiService } from '../../../core/services/task-api.service';
import { TimerApiService, CreateTimerRequest, UpdateTimerResponse } from '../../../core/services/timer-api.service';
import { NoteApiService } from '../../../core/services/note-api.service';
import { LockerLayoutApiService } from '../../../core/services/locker-layout-api.service';
import { ShortcutApiService } from '../../../core/services/shortcut-api.service';
import { BadgeApiService } from '../../../core/services/badge-api.service';
import { QuoteApiService } from '../../../core/services/quote-api.service';
import { BadgeCelebrationService } from '../../../shared/badge-celebration/badge-celebration.service';
import { BadgeCelebrationComponent } from '../../../shared/badge-celebration/badge-celebration.component';
import { BadgeShelfComponent } from '../../../shared/badge-shelf/badge-shelf.component';
import { LockerGridEngineService, FreeItem, MINIMIZED_HEIGHT_PX } from '../../../core/services/locker-grid-engine.service';
import { SessionStore } from '../../../core/session/session.store';
import { TaskItem, TaskList, Timer, Note, Shortcut, Sticker, EarnedBadge, NoteType, Quote } from '../../../core/models/task.models';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { InlineTitleEditComponent } from '../../../shared/inline-title-edit/inline-title-edit.component';
import { SwatchPickerComponent } from '../../../shared/swatch-picker/swatch-picker.component';
import { DueDatePopoverComponent } from '../../../shared/due-date-popover/due-date-popover.component';
import { TimerCardComponent } from '../../../shared/timer-card/timer-card.component';
import { BasicTimerCardComponent } from '../../../shared/basic-timer-card/basic-timer-card.component';
import { NoteCardComponent } from '../../../shared/note-card/note-card.component';
import { ShortcutIconComponent } from '../../../shared/shortcut-icon/shortcut-icon.component';
import { EmojiPickerComponent } from '../../../shared/sticker/emoji-picker.component';
import { StickerIconComponent } from '../../../shared/sticker-icon/sticker-icon.component';
import { StickerApiService, CreateStickerRequest } from '../../../core/services/sticker-api.service';
import { DEFAULT_PALETTE, autoContrastColor, isGradient, firstHexFromGradient } from '../../../shared/color-picker/color-utils';
import { WidgetTitleBarComponent } from '../../../shared/widget-title-bar/widget-title-bar.component';

type LockerCard =
  | { type: 'TASK_LIST'; data: TaskList }
  | { type: 'TIMER'; data: Timer }
  | { type: 'NOTE'; data: Note }
  | { type: 'STICKER'; data: Sticker };

interface CardLayout {
  posX: number;
  posY: number;
  width: number;
  height: number;
  order: number;
  minimized: boolean;
}

/** Default sticker dimensions in pixels (used when computing fallbacks). */
const STICKER_DEFAULT_PX = 80;
/** Default widget dimensions in pixels. */
const DEFAULT_WIDGET_WIDTH = 320;
const DEFAULT_WIDGET_HEIGHT = 220;
/** Minimum widget dimensions in pixels. */
const MIN_WIDGET_WIDTH = 200;
const MIN_WIDGET_HEIGHT = 120;
/** Minimum sticker dimension. */
const MIN_STICKER_SIZE = 32;
/** Drag and resize snap grid in pixels. */
const GRID_SNAP_PX = 8;
/** Viewport width below which single-column reflow activates. */
const NARROW_VIEWPORT_PX = 640;

/** Legacy grid constants kept for migration backfill only. */
const LEGACY_COL_WIDTH_PX = 40;
const LEGACY_DESKTOP_COLS = 24;

/** Bump this when the layout data format changes to trigger a one-time migration. */
const GRID_VERSION = 3;
const GRID_VERSION_KEY = 'hsht_gridVersion';

/**
 * Hardcoded favicon overrides for popular sites where auto-detection fails.
 * Google's favicon service returns the "G" for gmail.com because it's served
 * from a Google login page when not logged in. For these sites we serve the
 * actual brand icon via the Simple Icons CDN (https://simpleicons.org).
 *
 * To add more: find the brand slug at simpleicons.org and add both the bare
 * domain and any subdomains users might enter.
 */
const KNOWN_FAVICONS: Record<string, string> = {
  'gmail.com': 'https://cdn.simpleicons.org/gmail',
  'mail.google.com': 'https://cdn.simpleicons.org/gmail',
};

interface LockerColor {
  id: string;
  name: string;
  doorGradient: string;
  doorSolid: string;
  shelfText: string;  // text/icon color on the vibrant shelf header
}

const LOCKER_COLORS: LockerColor[] = [
  {
    id: 'blue', name: 'Blue',
    doorGradient: 'linear-gradient(135deg, #6aabdf 0%, #3d8ed4 45%, #2368b0 100%)',
    doorSolid: '#3d8ed4', shelfText: '#fff',
  },
  {
    id: 'red', name: 'Red',
    doorGradient: 'linear-gradient(135deg, #e86060 0%, #d42e2e 45%, #a81818 100%)',
    doorSolid: '#d42e2e', shelfText: '#fff',
  },
  {
    id: 'green', name: 'Green',
    doorGradient: 'linear-gradient(135deg, #4dcc7a 0%, #28a855 45%, #157038 100%)',
    doorSolid: '#28a855', shelfText: '#fff',
  },
  {
    id: 'orange', name: 'Orange',
    doorGradient: 'linear-gradient(135deg, #f0a040 0%, #e07820 45%, #b85810 100%)',
    doorSolid: '#e07820', shelfText: '#fff',
  },
  {
    id: 'purple', name: 'Purple',
    doorGradient: 'linear-gradient(135deg, #9870d8 0%, #7048c0 45%, #5030a0 100%)',
    doorSolid: '#7048c0', shelfText: '#fff',
  },
  {
    id: 'teal', name: 'Teal',
    doorGradient: 'linear-gradient(135deg, #30bcd0 0%, #1898a8 45%, #0c7080 100%)',
    doorSolid: '#1898a8', shelfText: '#fff',
  },
  {
    id: 'yellow', name: 'Yellow',
    doorGradient: 'linear-gradient(135deg, #e8d040 0%, #c8a810 45%, #a88808 100%)',
    doorSolid: '#c8a810', shelfText: '#1c1c1e',
  },
  {
    id: 'gray', name: 'Gray',
    doorGradient: 'linear-gradient(135deg, #8898bc 0%, #6878a0 45%, #485880 100%)',
    doorSolid: '#6878a0', shelfText: '#fff',
  },
];

const LOCKER_COLOR_KEY = 'hsht_lockerColorId';
const LOCKER_FONT_KEY = 'hsht_lockerFontId';
const LOCKER_FONT_SIZE_KEY = 'hsht_lockerFontSize';

export type LockerFontSizeId = 'small' | 'medium' | 'large';

export interface LockerFontSize {
  id: LockerFontSizeId;
  label: string;
  value: string;
}

export const LOCKER_FONT_SIZES: LockerFontSize[] = [
  { id: 'small', label: 'Small', value: '0.8rem' },
  { id: 'medium', label: 'Medium', value: '0.875rem' },
  { id: 'large', label: 'Large', value: '1rem' },
];

export interface LockerFont {
  id: string;
  name: string;
  family: string;
  googleFont?: boolean;
  /** Optional external stylesheet URL (used when the font isn't on Google Fonts). */
  cssUrl?: string;
}

export const LOCKER_FONTS: LockerFont[] = [
  { id: 'miras', name: "Mira's Handwriting", family: "'Miras Handwriting', cursive" },
  { id: 'nunito', name: 'Nunito', family: "'Nunito', sans-serif" },
  { id: 'patrick-hand', name: 'Patrick Hand', family: "'Patrick Hand', cursive" },
  { id: 'bangers', name: 'Bangers', family: "'Bangers', cursive" },
  { id: 'caveat', name: 'Caveat', family: "'Caveat', cursive", googleFont: true },
  { id: 'indie-flower', name: 'Indie Flower', family: "'Indie Flower', cursive", googleFont: true },
  { id: 'fredoka', name: 'Fredoka', family: "'Fredoka', sans-serif", googleFont: true },
  { id: 'bubblegum-sans', name: 'Bubblegum Sans', family: "'Bubblegum Sans', cursive", googleFont: true },
  { id: 'poppins', name: 'Poppins', family: "'Poppins', sans-serif", googleFont: true },
  { id: 'quicksand', name: 'Quicksand', family: "'Quicksand', sans-serif", googleFont: true },
  {
    id: 'opendyslexic',
    name: 'OpenDyslexic',
    family: "'OpenDyslexic', sans-serif",
    cssUrl: 'https://fonts.cdnfonts.com/css/opendyslexic',
  },
  {
    id: 'lexend',
    name: 'Lexend',
    family: "'Lexend', sans-serif",
    googleFont: true,
  },
];

/** Auto-naming convention: "To-dos", "To-dos #2", "To-dos #3", gap-filling */
export function nextListName(existingTitles: string[]): string {
  const pattern = /^List #(\d+)$/;
  const used = new Set(
    existingTitles
      .map(t => t.match(pattern))
      .filter((m): m is RegExpMatchArray => m !== null)
      .map(m => parseInt(m[1], 10))
  );
  for (let n = 1; n <= used.size + 1; n++) {
    if (!used.has(n)) return `List #${n}`;
  }
  return `List #${used.size + 1}`;
}

export function nextAutoName(existingTitles: string[], baseName: string): string {
  if (!existingTitles.includes(baseName)) return baseName;
  const pattern = new RegExp(`^${escapeRegex(baseName)} #(\\d+)$`);
  const used = new Set(
    existingTitles
      .map(t => t.match(pattern))
      .filter((m): m is RegExpMatchArray => m !== null)
      .map(m => parseInt(m[1], 10))
  );
  for (let n = 2; n < used.size + 3; n++) {
    if (!used.has(n)) return `${baseName} #${n}`;
  }
  return `${baseName} #${used.size + 2}`;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const LOCKER_ITEM_POOL = [
  '🧥','🎸','🎒','⚽','🏀','🎧','🥤','🏆','🖌️','💻',
  '☕','🎀','📸','👟','📐','🎨','🏈','🎯','🧢','🧸',
  '🎮','📱','🏐','🎺','🎻','🧲','🪴','🎙️','🎹','🥊',
];

// Zones covering the full interior height (above the bottom book shelf at ~78%).
// size is in vw — scales with the locker bay width (each bay = 20vw).
const LOCKER_ZONES = [
  // ── top row ──
  { top:  0, left:  0, size: 8.5,  rot: 13 },
  { top:  0, left: 52, size: 8.0,  rot:-12 },
  { top:  1, left: 25, size: 7.5,  rot:  8 },
  // ── upper-mid ──
  { top: 21, left:  0, size: 10.0, rot:-10 },
  { top: 19, left: 52, size:  9.5, rot: 11 },
  { top: 17, left: 22, size: 13.5, rot:  5 },  // big center item
  // ── mid ──
  { top: 43, left:  0, size: 10.5, rot: 12 },
  { top: 41, left: 53, size: 10.0, rot:-13 },
  { top: 39, left: 24, size: 11.5, rot: -5 },
  // ── lower (above book shelf ≈ top 78%) ──
  { top: 60, left:  0, size:  9.5, rot:-13 },
  { top: 58, left: 53, size:  9.0, rot: 12 },
  { top: 57, left: 24, size: 10.0, rot:  7 },
];

@Component({
  selector: 'app-locker',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DragDropModule,
    ConfirmDialogComponent, InlineTitleEditComponent, SwatchPickerComponent, DueDatePopoverComponent,
    TimerCardComponent, BasicTimerCardComponent, NoteCardComponent, ShortcutIconComponent, EmojiPickerComponent,
    StickerIconComponent, BadgeShelfComponent, BadgeCelebrationComponent, WidgetTitleBarComponent],
  template: `
    <!-- ── Locker row animation overlay ── -->
    <div class="locker-overlay"
      *ngIf="!lockerDone()"
      [class.locker-overlay--opening]="lockerOpening()"
      style="background: #1a2028">

      <ng-container *ngFor="let n of lockerBays; let i = index">
        <div class="locker-bay" [class.locker-bay--center]="i === 2">

          <!-- Locker interior — only visible through the opening center door -->
          <div *ngIf="i === 2" class="locker-interior">
            <!-- Random items scattered throughout -->
            <span *ngFor="let item of lockerItems"
              class="locker-item"
              [style.top.%]="item.top"
              [style.left.%]="item.left"
              [style.font-size]="item.size + 'vw'"
              [style.transform]="'rotate(' + item.rot + 'deg)'">{{ item.emoji }}</span>
            <!-- Bottom shelf — always books -->
            <div class="locker-shelf locker-shelf--bottom"></div>
            <div class="locker-books">📗📘📙📕📓</div>
          </div>

          <div class="locker-door"
            [class.locker-door--animated]="i === 2"
            [style.background]="lockerColor().doorGradient">

            <!-- Sticker on center locker only -->
            <img *ngIf="i === 2"
              class="locker-logo"
              src="/assets/images/home-logo.png"
              alt="" aria-hidden="true" />

            <!-- Vent groups -->
            <div class="locker-vents">
              <div class="locker-vent-group">
                <div class="locker-vent" *ngFor="let v of ventSlots"></div>
              </div>
              <div class="locker-vent-group">
                <div class="locker-vent" *ngFor="let v of ventSlots"></div>
              </div>
              <div class="locker-vent-group">
                <div class="locker-vent" *ngFor="let v of ventSlots"></div>
              </div>
            </div>

            <!-- Combination dial lock -->
            <div class="locker-lock">
              <div class="locker-lock__plate">
                <div class="locker-lock__dial"
                  [class.locker-lock__dial--spinning]="i === 2 && lockerSpinning()">
                  <span *ngIf="i === 2" class="locker-lock__indicator"></span>
                </div>
              </div>
            </div>

            <!-- 3D edge strip on opening door only -->
            <div *ngIf="i === 2" class="locker-door__edge"></div>
          </div>
        </div>
      </ng-container>

    </div>

    <!-- ── Dashboard (locker interior) ── -->
    <section
      class="dashboard"
      [ngStyle]="{
        '--lc-accent': lockerColor().doorSolid,
        '--lc-shelf-text': lockerColor().shelfText,
        '--locker-body-font-size': lockerFontSize().value
      }"
      (click)="closeConfig()"
    >
      <header class="dashboard__header">
        <div class="top-row">
          <div class="brand">
            <a routerLink="/" class="brand__link">
              <img src="/assets/images/home-logo.png" alt="High School How To" />
              <div class="brand__text">
                <h1>My Locker</h1>
              </div>
            </a>
          </div>
          <div class="header-right">
            <div class="locker-color-picker" (click)="$event.stopPropagation()">
              <span class="locker-color-picker__label">Locker:</span>
              <div class="locker-color-swatches">
                <button
                  type="button"
                  *ngFor="let c of LOCKER_COLORS"
                  class="locker-swatch"
                  [class.locker-swatch--active]="lockerColor().id === c.id"
                  [style.background]="c.doorSolid"
                  [attr.aria-label]="'Set locker color to ' + c.name"
                  (click)="setLockerColor(c)"
                ></button>
              </div>
            </div>
            <nav class="nav-links">
              <a routerLink="/" class="nav-link">← Home</a>
              <a *ngIf="isAdmin()" routerLink="/admin" class="nav-link nav-link--admin">Admin</a>
              <button type="button" class="nav-link nav-link--logout" (click)="handleLogout()">Log out</button>
            </nav>
          </div>
        </div>
        <div class="locker-app-bar" (click)="$event.stopPropagation()">
          <button type="button" class="app-icon-btn"
                  [disabled]="atListLimit()"
                  [title]="atListLimit() ? 'Maximum of 20 lists reached' : 'Create a to-do list'"
                  (click)="createList()" aria-label="Create new to-do list">
            <span class="app-icon-btn__icon">📋</span>
            <span class="app-icon-btn__label">To-do</span>
          </button>
          <div style="position:relative;display:inline-block">
            <button type="button" class="app-icon-btn"
                    [disabled]="atTimerLimit()"
                    [title]="atTimerLimit() ? 'Maximum of 10 timers reached' : 'Create a timer'"
                    (click)="toggleTimerMenu(); $event.stopPropagation()" aria-label="Create new timer">
              <span class="app-icon-btn__icon">⏱</span>
              <span class="app-icon-btn__label">Timer</span>
            </button>
            <div *ngIf="timerMenuOpen" class="note-submenu" (click)="$event.stopPropagation()">
              <button type="button" class="note-submenu__item"
                      [disabled]="hasIndependentBasicTimer()"
                      [title]="hasIndependentBasicTimer() ? 'A Basic Timer already exists' : ''"
                      (click)="createTimer('BASIC')">
                ⏱ Basic Timer
              </button>
              <button type="button" class="note-submenu__item"
                      [disabled]="hasIndependentPomodoro()"
                      [title]="hasIndependentPomodoro() ? 'A Pomodoro Timer already exists' : ''"
                      (click)="createTimer('POMODORO')">
                🍅 Pomodoro Timer
              </button>
            </div>
          </div>
          <button type="button" class="app-icon-btn"
                  [disabled]="atNoteLimit()"
                  [title]="atNoteLimit() ? 'Maximum of 20 notes reached' : 'Create a note'"
                  (click)="createNote('REGULAR'); $event.stopPropagation()" aria-label="Create new note">
            <span class="app-icon-btn__icon">📝</span>
            <span class="app-icon-btn__label">Note</span>
          </button>
          <button type="button" class="app-icon-btn"
                  title="Shortcuts"
                  (click)="toggleShortcutsPanel(); $event.stopPropagation()" aria-label="Shortcuts">
            <span class="app-icon-btn__icon">🚀</span>
            <span class="app-icon-btn__label">Shortcuts</span>
          </button>
          <button type="button" class="app-icon-btn"
                  title="Quote of the day"
                  (click)="toggleQuotePanel(); $event.stopPropagation()" aria-label="Quote of the day">
            <span class="app-icon-btn__icon">💬</span>
            <span class="app-icon-btn__label">Quote</span>
          </button>
          <button type="button" class="app-icon-btn"
                  [title]="atStickerLimit() ? 'Maximum of 50 stickers reached' : 'Add a sticker'"
                  (click)="toggleStickerPanel(); $event.stopPropagation()" aria-label="Add sticker">
            <span class="app-icon-btn__icon">🏷️</span>
            <span class="app-icon-btn__label">Stickers</span>
          </button>
          <button type="button" class="app-icon-btn app-icon-btn--font"
                  [title]="'Locker font: ' + lockerFont().name"
                  (click)="toggleFontPicker(); $event.stopPropagation()" aria-label="Change locker font">
            <span class="app-icon-btn__icon">Aa</span>
            <span class="app-icon-btn__label">Fonts</span>
          </button>
          <button type="button" class="app-icon-btn"
                  title="My Badges"
                  (click)="toggleBadgeShelf(); $event.stopPropagation()" aria-label="My Badges">
            <span class="app-icon-btn__icon">🏅</span>
            <span class="app-icon-btn__label">Badges</span>
          </button>
          <button type="button" class="app-icon-btn"
                  title="Auto-arrange widgets"
                  (click)="autoArrange(); $event.stopPropagation()" aria-label="Auto-arrange widgets">
            <span class="app-icon-btn__icon">⊞</span>
            <span class="app-icon-btn__label">Arrange</span>
          </button>
        </div>
        <div class="header-panel" *ngIf="badgeShelfOpen" (click)="$event.stopPropagation()">
          <app-badge-shelf [badges]="earnedBadges()"></app-badge-shelf>
        </div>
        <div class="shortcuts-panel" *ngIf="shortcutsPanelOpen" (click)="$event.stopPropagation()">
          <div class="shortcuts-panel__list"
               cdkDropList
               cdkDropListOrientation="horizontal"
               (cdkDropListDropped)="reorderShortcuts($event)">
            <app-shortcut-icon
              *ngFor="let s of shortcuts()"
              cdkDrag
              cdkDragLockAxis="x"
              [cdkDragData]="s"
              [shortcut]="s"
              (editRequested)="onShortcutEditRequested($event)"
              (deleteRequested)="onShortcutDeleteRequested($event)"
            ></app-shortcut-icon>
          </div>
          <button type="button" class="shortcuts-panel__add"
                  [disabled]="atShortcutLimit()"
                  [title]="atShortcutLimit() ? 'Maximum of 50 shortcuts reached' : 'Add a shortcut'"
                  (click)="openAddShortcutDialog()"
                  aria-label="Add a shortcut">+</button>
        </div>
        <div class="quote-panel" *ngIf="quotePanelOpen" (click)="$event.stopPropagation()">
          <ng-container *ngIf="todayQuote(); else quoteLoading">
            <blockquote class="quote-panel__quote">
              <p class="quote-panel__text">"{{ todayQuote()!.quoteText }}"</p>
              <footer *ngIf="todayQuote()!.attribution" class="quote-panel__attribution">— {{ todayQuote()!.attribution }}</footer>
            </blockquote>
          </ng-container>
          <ng-template #quoteLoading>
            <span class="quote-panel__loading">Loading quote…</span>
          </ng-template>
        </div>
        <div class="font-picker-panel" *ngIf="fontPickerOpen" (click)="$event.stopPropagation()">
          <button *ngFor="let f of LOCKER_FONTS" type="button" class="font-option"
                  [class.font-option--active]="lockerFont().id === f.id"
                  [style.fontFamily]="f.family"
                  (click)="setLockerFont(f)">{{ f.name }}</button>
          <div class="font-size-row">
            <span class="font-size-label">Size</span>
            <div class="font-size-stops">
              <button *ngFor="let s of LOCKER_FONT_SIZES" type="button" class="font-size-stop"
                      [class.font-size-stop--active]="lockerFontSize().id === s.id"
                      (click)="setLockerFontSize(s)">{{ s.label }}</button>
            </div>
          </div>
        </div>
        <!-- Sticker picker panel (full-width, below icon row) -->
        <div *ngIf="stickerDialogOpen" class="sticker-panel" (click)="$event.stopPropagation()">
          <p *ngIf="atStickerLimit()" class="sticker-panel__limit">Sticker limit reached (50)</p>
          <app-emoji-picker
            *ngIf="!atStickerLimit()"
            [inline]="true"
            (emojiSelected)="onStickerDialogEmojiSelected($event)"
          ></app-emoji-picker>
        </div>
        <p *ngIf="errorMessage" class="error">{{ errorMessage }}</p>
      </header>

      <!-- Add / Edit Shortcut dialog -->
      <div *ngIf="shortcutDialogOpen"
           class="shortcut-dialog-backdrop"
           (click)="closeShortcutDialog()"
           (keydown.escape)="closeShortcutDialog()">
        <div class="shortcut-dialog" (click)="$event.stopPropagation()" (keydown.enter)="onShortcutDialogEnter($any($event))">
          <h3 class="shortcut-dialog__title">{{ editingShortcut ? 'Edit Shortcut' : 'Add Shortcut' }}</h3>

          <label class="shortcut-dialog__label">URL</label>
          <input class="shortcut-dialog__input"
                 type="url"
                 [(ngModel)]="shortcutUrlDraft"
                 placeholder="google.com"
                 (blur)="onShortcutUrlBlur()"
                 (keydown.enter)="onShortcutUrlBlur()" />

          <div class="shortcut-dialog__label-row">
            <label class="shortcut-dialog__label">Name</label>
            <button type="button"
                    class="shortcut-dialog__refetch-btn"
                    [disabled]="!shortcutUrlDraft.trim() || shortcutMetadataFetching"
                    (click)="refetchShortcutMetadata()"
                    title="Re-fetch title and favicon from URL">
              {{ shortcutMetadataFetching ? '…' : '↻ Refresh' }}
            </button>
          </div>
          <input class="shortcut-dialog__input"
                 type="text"
                 [(ngModel)]="shortcutNameDraft"
                 placeholder="Auto-filled from page title"
                 maxlength="255" />

          <label class="shortcut-dialog__label">Icon</label>
          <div class="shortcut-dialog__icon-opts">
            <label class="shortcut-dialog__radio">
              <input type="radio" name="iconType" value="favicon"
                     [(ngModel)]="shortcutIconType" />
              Favicon (default)
              <img *ngIf="shortcutFaviconPreview"
                   class="shortcut-dialog__favicon-preview"
                   [src]="shortcutFaviconPreview" alt="favicon preview" />
            </label>
            <label class="shortcut-dialog__radio">
              <input type="radio" name="iconType" value="emoji"
                     [(ngModel)]="shortcutIconType" />
              Emoji
              <span *ngIf="shortcutIconType === 'emoji' && shortcutEmojiDraft"
                    class="shortcut-dialog__emoji-preview">{{ shortcutEmojiDraft }}</span>
            </label>
          </div>
          <app-emoji-picker
            *ngIf="shortcutIconType === 'emoji' && !shortcutEmojiDraft"
            (emojiSelected)="shortcutEmojiDraft = $event"
          ></app-emoji-picker>
          <button *ngIf="shortcutIconType === 'emoji' && shortcutEmojiDraft"
                  type="button"
                  class="ghost shortcut-dialog__change-emoji"
                  (click)="shortcutEmojiDraft = ''">Choose a different emoji</button>

          <div class="shortcut-dialog__actions">
            <button type="button" class="ghost" (click)="closeShortcutDialog()">Cancel</button>
            <button type="button"
                    [disabled]="!shortcutUrlDraft.trim()"
                    (click)="saveShortcut()">
              {{ editingShortcut ? 'Save' : 'Add' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Confirm delete shortcut dialog -->
      <app-confirm-dialog
        *ngIf="confirmDeleteShortcut"
        [itemName]="confirmDeleteShortcut.name"
        [message]="'Delete ' + confirmDeleteShortcut.name + '? This can\\'t be undone.'"
        (confirmed)="onConfirmDeleteShortcut()"
        (cancelled)="confirmDeleteShortcut = null"
      ></app-confirm-dialog>

      <!-- Confirm delete card dialog (from title bar close button) -->
      <app-confirm-dialog
        *ngIf="confirmDeleteCard"
        [itemName]="getCardTitle(confirmDeleteCard)"
        (confirmed)="onConfirmDeleteCard()"
        (cancelled)="confirmDeleteCard = null"
      ></app-confirm-dialog>

      <!-- Badge celebration modal -->
      <app-badge-celebration></app-badge-celebration>

      <!-- Confirm delete dialog (shown outside of grid to avoid z-index issues) -->
      <app-confirm-dialog
        *ngIf="confirmDeleteList"
        [itemName]="confirmDeleteList.title"
        (confirmed)="onConfirmDeleteList()"
        (cancelled)="onCancelDeleteList()"
      ></app-confirm-dialog>

      <app-confirm-dialog
        *ngIf="confirmCleanList"
        [itemName]="confirmCleanList.title"
        [message]="'Remove completed to-dos from ' + confirmCleanList.title + '? This can\\'t be undone.'"
        (confirmed)="onConfirmClean()"
        (cancelled)="onCancelClean()"
      ></app-confirm-dialog>

      <!-- ── Normal grid ── -->
      <div class="lists"
           #gridContainer
           *ngIf="orderedCards().length"
           [class.lists--sticker-mode]="stickerDialogOpen"
           [style.min-height.px]="gridHeight()"
           (mousemove)="onGridMouseMove($event)"
           (mouseleave)="hoveredWidgetIds.set(emptySet)"
           (dragover)="onGridDragOver($event)"
           (drop)="onGridDrop($event)">
        <!-- Sticker layer: always beneath widget layer. Interactive (drag/resize) only
             in sticker edit mode (stickerDialogOpen). -->
        <div
          *ngFor="let card of stickerCards(); trackBy: trackByCardId"
          class="grid-widget grid-widget--sticker"
          [class.grid-widget--dragging]="dragCardId === card.data.id"
          [style.top.px]="getCardTop(card)"
          [style.left]="getCardLeft(card)"
          [style.width]="getCardWidth(card)"
          [style.height.px]="getCardHeight(card)"
          [style.z-index]="getCardZIndex(card)"
          (mousedown)="onDragStart($event, card)"
        >
          <app-sticker-icon
            [sticker]="asSticker(card)!"
            (delete)="onStickerDeleted(asSticker(card)!.id)"
          ></app-sticker-icon>

          <!-- Resize handles only visible in sticker edit mode -->
          <ng-container *ngIf="stickerDialogOpen">
            <div class="widget-rh widget-rh--e"  (mousedown)="onResizeStart($event, card, 'e')"></div>
            <div class="widget-rh widget-rh--n"  (mousedown)="onResizeStart($event, card, 'n')"></div>
            <div class="widget-rh widget-rh--s"  (mousedown)="onResizeStart($event, card, 's')"></div>
            <div class="widget-rh widget-rh--w"  (mousedown)="onResizeStart($event, card, 'w')"></div>
            <div class="widget-rh widget-rh--nw" (mousedown)="onResizeStart($event, card, 'nw')"></div>
            <div class="widget-rh widget-rh--ne" (mousedown)="onResizeStart($event, card, 'ne')"></div>
            <div class="widget-rh widget-rh--sw" (mousedown)="onResizeStart($event, card, 'sw')"></div>
            <div class="widget-rh widget-rh--se" (mousedown)="onResizeStart($event, card, 'se')"></div>
          </ng-container>
        </div>

        <!-- Widget layer: stacked above stickers -->
        <div
          *ngFor="let card of widgetCards(); trackBy: trackByCardId"
          #widgetEl
          [attr.data-card-id]="card.data.id"
          class="grid-widget"
          [class.grid-widget--minimized]="isCardMinimized(card)"
          [class.grid-widget--dragging]="dragCardId === card.data.id"
          [class.grid-widget--note]="card.type === 'NOTE'"
          [class.grid-widget--task-list]="card.type === 'TASK_LIST'"
          [class.grid-widget--timer]="card.type === 'TIMER'"
          [style.top.px]="getCardTop(card)"
          [style.left]="getCardLeft(card)"
          [style.width]="getCardWidth(card)"
          [style.height.px]="getCardHeight(card)"
          [style.z-index]="getCardZIndex(card)"
          [style.font-size]="getWidgetFontSize(card)"
          (mousedown)="onDragStart($event, card)"
          [style.background]="getCardColor(card)"
        >
          <!-- Widget title bar (drag handle) — only for types without their own title bar -->
          <app-widget-title-bar
            *ngIf="card.type !== 'TIMER' && card.type !== 'NOTE'"
            [title]="getCardTitle(card)"
            [minimized]="isCardMinimized(card)"
            (minimizeToggled)="toggleMinimize(card)"
            (closeClicked)="requestDeleteCard(card)"
          >
            <ng-container *ngIf="card.type === 'TASK_LIST' && asTaskList(card) as list">
              <button type="button" class="title-bar-icon-btn" aria-label="List color" (click)="toggleColorPicker(list, $event)">🌈</button>
            </ng-container>
          </app-widget-title-bar>

          <!-- Widget body: hidden when minimized for cards with an outer title bar.
               NOTE and TIMER cards own their title bar internally, so the body is
               always rendered and the component handles its own collapsed state. -->
          <div class="widget-body" *ngIf="card.type === 'NOTE' || card.type === 'TIMER' || !isCardMinimized(card)">

          <!-- Timer card (Pomodoro) -->
          <app-timer-card
            *ngIf="card.type === 'TIMER' && asTimer(card)!.timerType !== 'BASIC'"
            [attr.id]="'timer-' + card.data.id"
            [timer]="asTimer(card)!"
            [taskLists]="taskLists()"
            [startInConfigMode]="shouldStartTimerInConfig(card.data.id)"
            (timerUpdated)="onTimerUpdated($event); clearTimerConfigFlag(card.data.id)"
            (timerDeleted)="onTimerDeleted($event); clearTimerConfigFlag(card.data.id)"
            (taskCheckChange)="onTimerTaskCheckChange($event)"
          ></app-timer-card>

          <!-- Timer card (Basic) -->
          <app-basic-timer-card
            *ngIf="card.type === 'TIMER' && asTimer(card)!.timerType === 'BASIC'"
            [attr.id]="'timer-' + card.data.id"
            [timer]="asTimer(card)!"
            [startInConfigMode]="shouldStartTimerInConfig(card.data.id)"
            (timerUpdated)="onTimerUpdated($event); clearTimerConfigFlag(card.data.id)"
            (timerDeleted)="onTimerDeleted($event); clearTimerConfigFlag(card.data.id)"
          ></app-basic-timer-card>

          <!-- Note card -->
          <app-note-card
            *ngIf="card.type === 'NOTE'"
            [note]="asNote(card)!"
            [minimized]="isCardMinimized(card)"
            (minimizeToggled)="toggleMinimize(card)"
            (noteUpdated)="onNoteUpdated($event)"
            (noteDeleted)="onNoteDeleted($event)"
          ></app-note-card>

          <!-- Task list card -->
          <ng-container *ngIf="asTaskList(card) as list">
          <article
            class="list-card"
            tabindex="0"
            [style.background]="list.color || '#fffef8'"
            [style.color]="cardTextColor(list)"
            [class.list-card--elevated]="dueDatePopoverListId === list.id || colorPickerListId === list.id"
            (click)="$event.stopPropagation()"
            (mouseenter)="$any($event.currentTarget).focus()"
            (keydown)="onListKeydown($event, list)"
          >
            <header class="list-card__header">
              <app-inline-title-edit
                *ngIf="isListEditMode(list)"
                [title]="list.title"
                (titleChange)="onListTitleChange(list, $event)"
              ></app-inline-title-edit>
              <div class="list-actions">
                <ng-container *ngIf="isListEditMode(list); else viewModeActions">
                  <button
                    type="button"
                    class="icon-button icon-button--save"
                    title="Done editing"
                    aria-label="Done editing list"
                    (click)="commitListEditMode(list); $event.stopPropagation()"
                  >✓</button>
                </ng-container>
                <ng-template #viewModeActions>
                  <button
                    type="button"
                    class="icon-button palette"
                    title="Edit list"
                    aria-label="Edit list"
                    (click)="enterListEditMode(list); $event.stopPropagation()"
                  >✏️</button>
                </ng-template>
              </div>
              <div
                class="color-picker-panel floating"
                *ngIf="colorPickerListId === list.id"
                (click)="$event.stopPropagation()"
                (keydown.enter)="saveCardColor(list)"
              >
                <app-swatch-picker
                  [selectedColor]="list.color"
                  (colorChange)="onCardColorChange(list, $event)"
                  (colorCommit)="onCardColorCommit(list, $event)"
                  (escaped)="cancelCardColor(list)"
                ></app-swatch-picker>
                <div class="color-picker-actions">
                  <button type="button" class="ghost color-picker-cancel" (click)="cancelCardColor(list)">Cancel</button>
                  <button type="button" class="ghost color-picker-save" (click)="saveCardColor(list)">Save</button>
                </div>
              </div>
            </header>


            <ul class="task-list" [class.task-list--view-mode]="!isListEditMode(list)"
                cdkDropList [cdkDropListDisabled]="!isListEditMode(list)"
                (cdkDropListDropped)="reorderTasks(list, $event)">
              <li *ngFor="let task of list.tasks" cdkDrag cdkDragLockAxis="y"
                  [cdkDragDisabled]="!isListEditMode(list)">
                <span *ngIf="isListEditMode(list)"
                      class="drag-handle" cdkDragHandle aria-label="Drag to reorder">☰</span>
                <div class="task-row"
                     [class.task-row--clickable]="!isListEditMode(list)"
                     *ngIf="!isEditing(task.id); else editRow"
                     (click)="!isListEditMode(list) && toggleTask(list, task, !task.completed)">
                  <input
                    type="checkbox"
                    [checked]="task.completed"
                    (click)="$event.stopPropagation()"
                    (change)="toggleTask(list, task, $any($event.target).checked)"
                    aria-label="Mark task complete"
                  />
                  <div class="task-content">
                    <div class="task-main-row">
                      <button
                        *ngIf="isListEditMode(list); else taskTextReadOnly"
                        type="button"
                        class="task-text"
                        [class.completed]="task.completed"
                        (click)="startEdit(task)"
                      >
                        {{ task.description }}
                      </button>
                      <ng-template #taskTextReadOnly>
                        <span class="task-text task-text--readonly"
                              [class.completed]="task.completed">
                          {{ task.description }}
                        </span>
                      </ng-template>
                      <button *ngIf="isListEditMode(list)"
                              type="button" class="calendar-icon-btn"
                              (click)="openDueDatePopover(list, task, $event)"
                              title="Set due date" aria-label="Set due date">🗓</button>
                    </div>
                    <div class="task-due" *ngIf="task.dueAt">
                      <button type="button"
                              class="due-date-btn"
                              [class.due-date-btn--overdue]="isOverdue(task)"
                              [disabled]="!isListEditMode(list)"
                              (click)="isListEditMode(list) && openDueDatePopover(list, task, $event)">
                        Due: {{ formatDueDate(task.dueAt) }}
                      </button>
                    </div>
                  </div>
                  <button *ngIf="isListEditMode(list)"
                          type="button" class="icon-button danger"
                          (click)="removeTask(list, task)" aria-label="Remove task">
                    ×
                  </button>
                </div>

                <!-- Due date popover -->
                <div class="due-date-popover-wrap"
                     *ngIf="isListEditMode(list) && dueDatePopoverTaskId === task.id"
                     (click)="$event.stopPropagation()">
                  <app-due-date-popover
                    [dueAt]="task.dueAt ?? null"
                    (dueAtChange)="onDueDateChange(list, task, $event)"
                    (cancelled)="dueDatePopoverTaskId = null"
                  ></app-due-date-popover>
                </div>

                <ng-template #editRow>
                  <div class="task-row editing">
                    <input
                      #editInput
                      class="edit-input"
                      [attr.data-task-id]="task.id"
                      [(ngModel)]="editDrafts[task.id]"
                      [ngModelOptions]="{ standalone: true }"
                      (keydown.enter)="saveEdit(list, task)"
                      (keydown.escape)="cancelEdit(task)"
                      (keydown.tab)="$event.preventDefault(); openDueDatePopover(list, task, $event)"
                      (blur)="saveEdit(list, task)"
                    />
                    <button type="button" class="ghost" (click)="removeTask(list, task)">Remove</button>
                  </div>
                </ng-template>
              </li>
            </ul>

            <form *ngIf="isListEditMode(list)"
                  class="new-task" (ngSubmit)="addTask(list)" #taskForm="ngForm">
              <input
                #taskInput
                [attr.data-list-id]="list.id"
                name="task-{{ list.id }}"
                [(ngModel)]="taskDrafts[list.id]"
                placeholder="Add a to-do…"
                required
                (keydown.enter)="onAddInputEnter($event, list)"
              />
              <button type="submit" [disabled]="!taskDrafts[list.id]?.trim()">Add</button>
            </form>
          </article>
          </ng-container>

          </div><!-- /widget-body -->

          <!-- All-sides resize handles (shown on hover) -->
          <div class="widget-rh widget-rh--e"  (mousedown)="onResizeStart($event, card, 'e')"></div>
          <div class="widget-rh widget-rh--n"  (mousedown)="onResizeStart($event, card, 'n')"></div>
          <div class="widget-rh widget-rh--s"  (mousedown)="onResizeStart($event, card, 's')"></div>
          <div class="widget-rh widget-rh--w"  (mousedown)="onResizeStart($event, card, 'w')"></div>
          <div class="widget-rh widget-rh--nw" (mousedown)="onResizeStart($event, card, 'nw')"></div>
          <div class="widget-rh widget-rh--ne" (mousedown)="onResizeStart($event, card, 'ne')"></div>
          <div class="widget-rh widget-rh--sw" (mousedown)="onResizeStart($event, card, 'sw')"></div>
          <div class="widget-rh widget-rh--se" (mousedown)="onResizeStart($event, card, 'se')"></div>
        </div>
      </div>

      <!-- Empty state -->
      <div class="empty-card" *ngIf="!orderedCards().length">
        <div class="empty-card__icon" aria-hidden="true">🔓</div>
        <h2>Your locker is empty</h2>
        <p class="empty-card__lead">
          Welcome to your Locker. Start by creating a todo list — classes, projects, habits, anything you need to juggle.
        </p>
        <ul class="empty-card__steps">
          <li>Add your first todo list using the form above.</li>
          <li>Add tasks under any list and drag to reorder.</li>
          <li>Color-code lists to keep subjects and priorities clear.</li>
        </ul>
      </div>
    </section>
  `,
  styleUrl: './locker.component.scss',
})
export class LockerComponent implements AfterViewInit, OnInit {
  private readonly sessionStore = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly gridEngine = inject(LockerGridEngineService);

  protected readonly isAdmin = this.sessionStore.isAdmin;

  protected readonly LOCKER_COLORS = LOCKER_COLORS;
  protected readonly LOCKER_FONTS = LOCKER_FONTS;
  protected readonly LOCKER_FONT_SIZES = LOCKER_FONT_SIZES;
  protected lockerColor = signal<LockerColor>(this.loadLockerColor());
  protected lockerFont = signal<LockerFont>(this.loadLockerFont());
  protected lockerFontSize = signal<LockerFontSize>(this.loadLockerFontSize());

  // Animation phases
  protected lockerDone = signal(false);
  protected lockerSpinning = signal(false);
  protected lockerOpening = signal(false);
  protected readonly lockerBays = [0, 1, 2, 3, 4];  // 5 lockers; index 2 is center
  protected readonly ventSlots = [1, 2, 3, 4, 5];
  protected lockerItems: { emoji: string; top: number; left: number; size: number; rot: number }[] = [];

  protected readonly taskLists = signal<TaskList[]>([]);
  protected readonly timers = signal<Timer[]>([]);
  protected readonly notes = signal<Note[]>([]);
  protected readonly shortcuts = signal<Shortcut[]>([]);
  protected readonly stickers = signal<Sticker[]>([]);
  protected stickerDialogOpen = false;
  protected taskDrafts: Record<string, string> = {};
  protected errorMessage = '';
  protected editDrafts: Record<string, string> = {};

  protected readonly colorPalette = DEFAULT_PALETTE;

  private readonly editingTaskIds = new Set<string>();
  protected colorDrafts: Record<string, string> = {};
  protected colorOriginals: Record<string, string> = {};

  // Minimized state for task list cards (by list id)
  protected minimizedLists: Record<string, boolean> = {};

  // Edit vs view mode per task list (by list id). Undefined means "use default":
  // edit mode when the list is empty, view mode once it has items.
  protected listEditModeOverrides: Record<string, boolean> = {};


  // New Phase 1 state
  protected colorPickerListId: string | null = null;
  protected confirmDeleteList: TaskList | null = null;
  protected confirmCleanList: TaskList | null = null;
  protected dueDatePopoverTaskId: string | null = null;
  protected dueDatePopoverListId: string | null = null;
  protected fontPickerOpen = false;

  // Shortcuts panel + dialog state
  protected shortcutsPanelOpen = false;
  protected quotePanelOpen = false;
  protected shortcutDialogOpen = false;
  protected editingShortcut: Shortcut | null = null;
  protected shortcutUrlDraft = '';
  protected shortcutNameDraft = '';
  protected shortcutFaviconPreview: string | null = null;
  protected shortcutMetadataFetching = false;
  /** True once the backend has returned an authoritative favicon (from the final redirected domain). */
  private shortcutFaviconCorrected = false;
  protected shortcutIconType: 'favicon' | 'emoji' = 'favicon';
  protected shortcutEmojiDraft = '';
  protected confirmDeleteShortcut: Shortcut | null = null;
  protected confirmDeleteCard: LockerCard | null = null;
  protected timerMenuOpen = false;
  protected badgeShelfOpen = false;
  /** Timer IDs that should open in configuration mode (newly created from the tray). */
  protected timerIdsAwaitingConfig = signal<Set<string>>(new Set());

  protected readonly atListLimit = computed(() => this.taskLists().length >= 20);
  protected readonly atTimerLimit = computed(() => this.timers().length >= 10);
  protected readonly hasIndependentPomodoro = computed(() =>
    this.timers().some(t => t.timerType !== 'BASIC' && !t.linkedTaskListId));
  protected readonly hasIndependentBasicTimer = computed(() =>
    this.timers().some(t => t.timerType === 'BASIC' && !t.linkedTaskListId));
  protected readonly atNoteLimit = computed(() => this.notes().length >= 20);
  protected readonly atShortcutLimit = computed(() => this.shortcuts().length >= 50);
  protected readonly atStickerLimit = computed(() => this.stickers().length >= 50);

  private readonly cardOrder = signal<Array<{ type: 'TASK_LIST' | 'TIMER' | 'NOTE' | 'STICKER'; id: string }>>([]);

  // ── Free-form layout state ──
  /** Per-card placement in pixel coordinates. */
  private readonly layoutMap = signal<Map<string, CardLayout>>(new Map());
  /** Current container width in px. */
  private readonly containerWidth = signal<number>(LEGACY_DESKTOP_COLS * LEGACY_COL_WIDTH_PX);
  /** Measured heights per card id (set by ResizeObserver). */
  private readonly heightMap = signal<Map<string, number>>(new Map());
  /** Grid container element ref for width measurement. Uses a setter so the
   *  ResizeObserver attaches whenever the element enters the DOM (it is behind
   *  an *ngIf, so it is not present on initial view init). */
  protected gridContainerRef?: ElementRef<HTMLElement>;
  @ViewChild('gridContainer') set gridContainerSetter(ref: ElementRef<HTMLElement> | undefined) {
    this.gridContainerRef = ref;
    this.attachResizeObserver();
  }
  private resizeObserver?: ResizeObserver;

  /** True when the viewport is narrow enough to reflow to a single column. */
  protected readonly isNarrow = computed(() => this.containerWidth() < NARROW_VIEWPORT_PX);

  /** Drag state */
  protected dragCardId: string | null = null;
  /** Mouse X offset within the dragged card at drag start. */
  private dragOffsetWithinCardX = 0;
  /** Mouse Y offset within the dragged card at drag start. */
  private dragOffsetWithinCardY = 0;

  // Manual double-click tracking for stickers — native dblclick gets swallowed
  // by the drag mousedown preventDefault chain, so we detect a rapid second
  // mousedown on the same sticker and treat it as "delete me".
  private lastStickerMouseDownAt = 0;
  private lastStickerMouseDownId: string | null = null;
  private static readonly DBL_CLICK_WINDOW_MS = 400;

  /** Resize state */
  private resizeCardId: string | null = null;
  private resizeDir = 'se';
  private resizeStartX = 0;
  private resizeStartY = 0;
  private resizeStartPosX = 0;
  private resizeStartPosY = 0;
  private resizeStartWidth = 0;
  private resizeStartHeight = 0;
  private resizeMinWidth = MIN_WIDGET_WIDTH;
  private resizeMinHeight = MIN_WIDGET_HEIGHT;

  protected readonly orderedCards = computed((): LockerCard[] => {
    const lists = this.taskLists();
    const timers = this.timers();
    const notes = this.notes();
    const stickers = this.stickers();
    const order = this.cardOrder();
    const listMap = new Map(lists.map(l => [l.id, l]));
    const timerMap = new Map(timers.map(t => [t.id, t]));
    const noteMap = new Map(notes.map(n => [n.id, n]));
    const stickerMap = new Map(stickers.map(s => [s.id, s]));
    if (order.length === 0) {
      return [
        ...lists.map(l => ({ type: 'TASK_LIST' as const, data: l })),
        ...timers.filter(t => !t.linkedTaskListId).map(t => ({ type: 'TIMER' as const, data: t })),
        ...notes.map(n => ({ type: 'NOTE' as const, data: n })),
        ...stickers.map(s => ({ type: 'STICKER' as const, data: s })),
      ];
    }
    const result: LockerCard[] = [];
    order.forEach(({ type, id }) => {
      if (type === 'TASK_LIST') {
        const list = listMap.get(id);
        if (list) result.push({ type: 'TASK_LIST', data: list });
      } else if (type === 'TIMER') {
        const timer = timerMap.get(id);
        // Linked timers are embedded inside their task list card — skip as standalone grid cards.
        if (timer && !timer.linkedTaskListId) result.push({ type: 'TIMER', data: timer });
      } else if (type === 'NOTE') {
        const note = noteMap.get(id);
        if (note) result.push({ type: 'NOTE', data: note });
      } else if (type === 'STICKER') {
        const sticker = stickerMap.get(id);
        if (sticker) result.push({ type: 'STICKER', data: sticker });
      }
    });
    // Append newly created cards not yet in saved order
    lists.forEach(l => { if (!order.find(o => o.type === 'TASK_LIST' && o.id === l.id)) result.push({ type: 'TASK_LIST', data: l }); });
    timers.forEach(t => { if (!order.find(o => o.type === 'TIMER' && o.id === t.id)) result.push({ type: 'TIMER', data: t }); });
    notes.forEach(n => { if (!order.find(o => o.type === 'NOTE' && o.id === n.id)) result.push({ type: 'NOTE', data: n }); });
    stickers.forEach(s => { if (!order.find(o => o.type === 'STICKER' && o.id === s.id)) result.push({ type: 'STICKER', data: s }); });
    return result;
  });

  /** Widget cards (everything except stickers). Stickers live on their own grid layer. */
  protected readonly widgetCards = computed((): LockerCard[] =>
    this.orderedCards().filter(c => c.type !== 'STICKER')
  );

  /** Sticker cards. Rendered on a separate grid layer behind the widgets. */
  protected readonly stickerCards = computed((): LockerCard[] =>
    this.orderedCards().filter(c => c.type === 'STICKER')
  );

  @ViewChildren('taskInput') private taskInputRefs!: QueryList<ElementRef<HTMLInputElement>>;
  @ViewChildren('editInput') private editInputRefs!: QueryList<ElementRef<HTMLInputElement>>;
  @ViewChildren('widgetEl') private widgetElRefs!: QueryList<ElementRef<HTMLElement>>;
  private widgetHeightObserver?: ResizeObserver;
  private observedWidgets = new Set<HTMLElement>();
  private pendingFocusListId: string | null = null;

  protected readonly earnedBadges = signal<EarnedBadge[]>([]);
  protected readonly todayQuote = signal<Quote | null>(null);

  constructor(
    private readonly taskApi: TaskApiService,
    private readonly timerApi: TimerApiService,
    private readonly noteApi: NoteApiService,
    private readonly shortcutApi: ShortcutApiService,
    private readonly stickerApi: StickerApiService,
    private readonly lockerLayoutApi: LockerLayoutApiService,
    private readonly badgeApi: BadgeApiService,
    private readonly badgeCelebration: BadgeCelebrationService,
    private readonly quoteApi: QuoteApiService,
  ) {
    effect(() => { this.loadCards(); });
  }

  ngOnInit(): void {
    this.quoteApi.getTodayQuote().subscribe({ next: q => this.todayQuote.set(q), error: () => {} });

    const shuffled = [...LOCKER_ITEM_POOL].sort(() => Math.random() - 0.5);
    this.lockerItems = LOCKER_ZONES.map((zone, i) => ({
      emoji: shuffled[i % shuffled.length],
      top:   zone.top  + (Math.random() - 0.5) * 4,
      left:  zone.left + (Math.random() - 0.5) * 6,
      size:  zone.size * (0.88 + Math.random() * 0.24),
      rot:   (Math.random() * 2 - 1) * zone.rot,
    }));

    // Apply saved locker font
    const savedFont = this.lockerFont();
    document.documentElement.style.setProperty('--locker-font', savedFont.family);
    if (savedFont.googleFont || savedFont.cssUrl) this.loadGoogleFont(savedFont);

    // Phase 1 (500ms pause) → Phase 2: dial spins (1300ms) → Phase 3: door swings open (900ms)
    setTimeout(() => {
      this.lockerSpinning.set(true);
      setTimeout(() => {
        this.lockerOpening.set(true);
        setTimeout(() => {
          this.lockerDone.set(true);
        }, 900);
      }, 1300);
    }, 500);
  }

  ngAfterViewInit(): void {
    this.taskInputRefs.changes.subscribe(() => {
      if (this.pendingFocusListId) this.tryFocusTaskInput(this.pendingFocusListId);
    });
    this.attachResizeObserver();

    // Observe each widget element for height changes and keep heightMap in sync.
    this.widgetHeightObserver = new ResizeObserver((entries) => {
      let changed = false;
      const updated = new Map(this.heightMap());
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        const id = el.dataset['cardId'];
        if (!id) continue;
        const h = Math.round(entry.contentRect.height);
        if (h > 0 && updated.get(id) !== h) {
          updated.set(id, h);
          changed = true;
        }
      }
      if (changed) this.heightMap.set(updated);
    });
    const syncWidgetObservers = () => {
      const current = new Set<HTMLElement>();
      this.widgetElRefs.forEach((ref) => {
        const el = ref.nativeElement;
        current.add(el);
        if (!this.observedWidgets.has(el)) {
          this.widgetHeightObserver!.observe(el);
          this.observedWidgets.add(el);
        }
      });
      // Unobserve removed elements.
      for (const el of this.observedWidgets) {
        if (!current.has(el)) {
          this.widgetHeightObserver!.unobserve(el);
          this.observedWidgets.delete(el);
        }
      }
    };
    this.widgetElRefs.changes.subscribe(syncWidgetObservers);
    syncWidgetObservers();
  }

  private attachResizeObserver(): void {
    if (typeof ResizeObserver === 'undefined') return;
    const el = this.gridContainerRef?.nativeElement;
    if (!el) return;
    // Avoid re-attaching to the same element.
    this.resizeObserver?.disconnect();
    this.resizeObserver = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      if (width > 0) this.containerWidth.set(width);
    });
    this.resizeObserver.observe(el);
    // Prime once immediately so we don't wait for a resize event.
    const width = el.getBoundingClientRect().width;
    if (width > 0) this.containerWidth.set(width);
  }

  protected setLockerColor(color: LockerColor): void {
    this.lockerColor.set(color);
    localStorage.setItem(LOCKER_COLOR_KEY, color.id);
  }

  private loadLockerColor(): LockerColor {
    const saved = localStorage.getItem(LOCKER_COLOR_KEY);
    return LOCKER_COLORS.find(c => c.id === saved) ?? LOCKER_COLORS[0];
  }

  protected setLockerFont(font: LockerFont): void {
    this.lockerFont.set(font);
    localStorage.setItem(LOCKER_FONT_KEY, font.id);
    this.fontPickerOpen = false;
    if (font.googleFont || font.cssUrl) this.loadGoogleFont(font);
    document.documentElement.style.setProperty('--locker-font', font.family);
  }

  private loadLockerFont(): LockerFont {
    const saved = localStorage.getItem(LOCKER_FONT_KEY);
    return LOCKER_FONTS.find(f => f.id === saved) ?? LOCKER_FONTS[0];
  }

  protected setLockerFontSize(size: LockerFontSize): void {
    this.lockerFontSize.set(size);
    localStorage.setItem(LOCKER_FONT_SIZE_KEY, size.id);
  }

  private loadLockerFontSize(): LockerFontSize {
    const saved = localStorage.getItem(LOCKER_FONT_SIZE_KEY);
    return LOCKER_FONT_SIZES.find(s => s.id === saved) ?? LOCKER_FONT_SIZES.find(s => s.id === 'medium')!;
  }

  private loadGoogleFont(font: LockerFont): void {
    const id = `gfont-${font.id}`;
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    if (font.cssUrl) {
      link.href = font.cssUrl;
    } else {
      const name = font.name.replace(/ /g, '+');
      link.href = `https://fonts.googleapis.com/css2?family=${name}&display=swap`;
    }
    document.head.appendChild(link);
  }

  protected toggleFontPicker(): void {
    this.fontPickerOpen = !this.fontPickerOpen;
    this.colorPickerListId = null;
    this.shortcutsPanelOpen = false;
    this.quotePanelOpen = false;
    this.badgeShelfOpen = false;
    this.stickerDialogOpen = false;
  }

  protected toggleShortcutsPanel(): void {
    this.shortcutsPanelOpen = !this.shortcutsPanelOpen;
    this.fontPickerOpen = false;
    this.badgeShelfOpen = false;
    this.quotePanelOpen = false;
    this.colorPickerListId = null;
    this.timerMenuOpen = false;
    this.stickerDialogOpen = false;
  }

  protected toggleQuotePanel(): void {
    this.quotePanelOpen = !this.quotePanelOpen;
    this.shortcutsPanelOpen = false;
    this.fontPickerOpen = false;
    this.badgeShelfOpen = false;
    this.colorPickerListId = null;
    this.timerMenuOpen = false;
    this.stickerDialogOpen = false;
  }

  protected toggleBadgeShelf(): void {
    this.badgeShelfOpen = !this.badgeShelfOpen;
    this.shortcutsPanelOpen = false;
    this.quotePanelOpen = false;
    this.fontPickerOpen = false;
    this.colorPickerListId = null;
    this.timerMenuOpen = false;
    this.stickerDialogOpen = false;
  }

  private loadCards(): void {
    forkJoin([
      this.taskApi.getTaskLists(),
      this.timerApi.getTimers(),
      this.noteApi.getNotes(),
      this.shortcutApi.getShortcuts(),
      this.stickerApi.getStickers(),
      this.badgeApi.getEarnedBadges(),
      this.lockerLayoutApi.getLayout(),
    ]).subscribe({
      next: ([lists, timers, notes, shortcuts, stickers, badges, layout]) => {
        this.taskLists.set(lists);
        this.timers.set(timers);
        this.notes.set(notes);
        this.shortcuts.set(shortcuts);
        this.stickers.set(stickers);
        this.earnedBadges.set(badges);

        // Apply saved layout into layoutMap and cardOrder.
        // If items are missing pixel coords (legacy grid-based layout), backfill them.
        if (layout.length > 0) {
          const newMap = new Map<string, CardLayout>();
          const newOrder: Array<{ type: 'TASK_LIST' | 'TIMER' | 'NOTE' | 'STICKER'; id: string }> = [];

          // Collect legacy data temporarily to compute pack positions.
          const legacyItems: Array<{ id: string; col: number; colSpan: number; order: number; minimized: boolean; minHeight: number | null }> = [];
          const needsFreeFormMigration = layout.some(item => item.width == null && item.cardType !== 'SHORTCUT');

          layout.forEach((item) => {
            if (item.cardType === 'SHORTCUT') return; // shortcuts no longer live in the grid

            if (item.width != null) {
              // Already free-form layout data.
              newMap.set(item.cardId, {
                posX: item.posX ?? 0,
                posY: item.posY ?? 0,
                width: item.width,
                height: item.height ?? DEFAULT_WIDGET_HEIGHT,
                order: item.order,
                minimized: item.minimized,
              });
            } else {
              // Legacy grid record — will be backfilled below.
              let col = item.col;
              let colSpan = item.colSpan;
              const legacyVersion = Number(localStorage.getItem(GRID_VERSION_KEY) ?? 0);
              if (legacyVersion < 2) {
                // Old grid: 12 cols × 80px → new: 24 cols × 40px.
                col = (col - 1) * 2 + 1;
                colSpan = colSpan * 2;
              }
              if (item.cardType === 'STICKER') {
                const w = colSpan * LEGACY_COL_WIDTH_PX - 16;
                const h = item.minHeight ?? STICKER_DEFAULT_PX;
                newMap.set(item.cardId, {
                  posX: item.posX ?? (col - 1) * LEGACY_COL_WIDTH_PX,
                  posY: item.posY ?? item.order * (STICKER_DEFAULT_PX + 16),
                  width: Math.max(MIN_STICKER_SIZE, w),
                  height: Math.max(MIN_STICKER_SIZE, h),
                  order: item.order,
                  minimized: item.minimized,
                });
              } else {
                legacyItems.push({ id: item.cardId, col, colSpan, order: item.order, minimized: item.minimized, minHeight: item.minHeight ?? null });
              }
            }
            newOrder.push({ type: item.cardType as 'TASK_LIST' | 'TIMER' | 'NOTE' | 'STICKER', id: item.cardId });
          });

          // Pack legacy widget items using the grid engine and estimated heights.
          if (legacyItems.length > 0) {
            const packInput = legacyItems.map(li => ({
              id: li.id,
              col: li.col,
              colSpan: li.colSpan,
              order: li.order,
              row: 0,
              minimized: li.minimized,
              height: li.minHeight ?? DEFAULT_WIDGET_HEIGHT,
            }));
            const packed = this.gridEngine.pack(packInput, LEGACY_DESKTOP_COLS, LEGACY_COL_WIDTH_PX);
            packed.forEach(p => {
              const li = legacyItems.find(l => l.id === p.id)!;
              newMap.set(p.id, {
                posX: (li.col - 1) * LEGACY_COL_WIDTH_PX,
                posY: p.top,
                width: Math.max(MIN_WIDGET_WIDTH, li.colSpan * LEGACY_COL_WIDTH_PX - 16),
                height: Math.max(MIN_WIDGET_HEIGHT, li.minHeight ?? DEFAULT_WIDGET_HEIGHT),
                order: li.order,
                minimized: li.minimized,
              });
            });
          }

          this.layoutMap.set(newMap);
          this.cardOrder.set(newOrder);
          if (needsFreeFormMigration) {
            localStorage.setItem(GRID_VERSION_KEY, String(GRID_VERSION));
            this.saveLockerLayout();
          }
        } else {
          localStorage.setItem(GRID_VERSION_KEY, String(GRID_VERSION));
        }
      },
      error: () => { this.errorMessage = 'Could not load your locker. Please log in again.'; },
    });
  }

  protected closeConfig(): void {
    this.colorPickerListId = null;
    this.fontPickerOpen = false;
    this.shortcutsPanelOpen = false;
    this.badgeShelfOpen = false;
    this.dueDatePopoverTaskId = null;
    this.dueDatePopoverListId = null;

    this.timerMenuOpen = false;
  }

  protected createList(): void {
    if (this.atListLimit()) return;
    const existingTitles = this.taskLists().map(l => l.title);
    const title = nextListName(existingTitles);
    const color = this.nextAvailableColor();
    this.taskApi.createList(title, color).subscribe({
      next: list => {
        this.taskLists.update(current => [...current, { ...list }]);
        this.listEditModeOverrides[list.id] = true;
        this.errorMessage = '';
        this.assignNewCardLayout(list.id, false, undefined, { posX: 0, posY: 0 });
        this.saveLockerLayout();
      },
      error: () => { this.errorMessage = 'Unable to add a list right now. Please try again or sign in again.'; },
    });
  }

  // --- Delete and Clean confirmation (new ConfirmDialogComponent-based) ---
  protected requestDelete(list: TaskList): void {
    // Skip confirmation if the list is empty or every task is already completed.
    if (this.isListTrivialToDelete(list)) {
      this.deleteList(list);
      return;
    }
    this.confirmDeleteList = list;
  }

  /** A list is "trivial" (skip-confirm) when it has no tasks or all tasks are completed. */
  private isListTrivialToDelete(list: TaskList): boolean {
    const tasks = list.tasks ?? [];
    return tasks.length === 0 || tasks.every(t => t.completed);
  }

  protected onConfirmDeleteList(): void {
    if (this.confirmDeleteList) this.deleteList(this.confirmDeleteList);
    this.confirmDeleteList = null;
  }

  protected onCancelDeleteList(): void {
    this.confirmDeleteList = null;
  }

  // --- Unified delete from title bar close button ---
  protected requestDeleteCard(card: LockerCard): void {
    // Task lists with no items or all tasks completed can be deleted without confirmation.
    if (card.type === 'TASK_LIST' && this.isListTrivialToDelete(card.data as TaskList)) {
      this.deleteList(card.data as TaskList);
      return;
    }
    // Empty notes need no confirmation.
    if (card.type === 'NOTE' && !((card.data as Note).content?.trim())) {
      this.onNoteDeleted(card.data.id);
      return;
    }
    this.confirmDeleteCard = card;
  }

  protected onConfirmDeleteCard(): void {
    const card = this.confirmDeleteCard;
    if (!card) return;
    this.confirmDeleteCard = null;

    switch (card.type) {
      case 'TASK_LIST':
        this.deleteList(card.data as TaskList);
        break;
      case 'TIMER':
        this.onTimerDeleted(card.data.id);
        break;
      case 'NOTE':
        this.onNoteDeleted(card.data.id);
        break;
      case 'STICKER':
        this.onStickerDeleted(card.data.id);
        break;
    }
  }

  protected onCancelClean(): void {
    this.confirmCleanList = null;
  }

  protected onConfirmClean(): void {
    if (this.confirmCleanList) this.clearCompleted(this.confirmCleanList);
    this.confirmCleanList = null;
  }

  // --- Color picker ---
  protected toggleColorPicker(list: TaskList, event: Event): void {
    event.stopPropagation();
    if (this.colorPickerListId === list.id) {
      this.colorPickerListId = null;
    } else {
      this.colorPickerListId = list.id;
      this.colorOriginals = { ...this.colorOriginals, [list.id]: list.color };
      this.colorDrafts = { ...this.colorDrafts, [list.id]: list.color };
      this.fontPickerOpen = false;
    }
  }

  protected onCardColorChange(list: TaskList, color: string): void {
    this.colorDrafts = { ...this.colorDrafts, [list.id]: color };
    this.taskLists.update(current => current.map(item => item.id === list.id ? { ...item, color } : item));
    this.timers.update(current => current.map(t => t.linkedTaskListId === list.id ? { ...t, color } : t));
  }

  protected onCardColorCommit(list: TaskList, color: string): void {
    this.onCardColorChange(list, color);
    this.saveCardColor(list);
  }

  protected saveCardColor(list: TaskList): void {
    const color = this.colorDrafts[list.id] ?? list.color;
    this.taskApi.updateListColor(list.id, color, null).subscribe({
      next: updated => {
        this.taskLists.update(current => current.map(item =>
          item.id === list.id ? { ...item, color: updated.color, textColor: updated.textColor } : item));
        // Cascade color to linked timer
        const linkedTimer = this.timers().find(t => t.linkedTaskListId === list.id);
        if (linkedTimer && linkedTimer.color !== updated.color) {
          this.cascadeColorToTimer(linkedTimer, updated.color, updated.textColor ?? null);
        }
      },
      error: () => {
        this.errorMessage = 'Could not save card color. Please try again.';
        const original = this.colorOriginals[list.id];
        if (original) {
          this.taskLists.update(current => current.map(item => item.id === list.id ? { ...item, color: original } : item));
        }
      },
    });
    this.colorPickerListId = null;
  }

  protected cancelCardColor(list: TaskList): void {
    this.colorPickerListId = null;
    const original = this.colorOriginals[list.id];
    if (original && original !== (this.colorDrafts[list.id] ?? list.color)) {
      this.taskLists.update(current => current.map(item => item.id === list.id ? { ...item, color: original } : item));
      this.timers.update(current => current.map(t => t.linkedTaskListId === list.id ? { ...t, color: original } : t));
    }
  }

  private cascadeColorToTimer(timer: Timer, color: string, textColor: string | null): void {
    this.timerApi.updateTimer(timer.id, {
      title: timer.title,
      color,
      textColor,
      presetName: timer.presetName ?? null,
      linkedTaskListId: timer.linkedTaskListId ?? null,
      clearLinkedTaskList: false,
    }).subscribe({
      next: updated => this.timers.update(current => current.map(t => t.id === updated.id ? updated : t)),
    });
  }

  protected cardTextColor(list: TaskList): string {
    if (list.textColor) return list.textColor;
    const bg = list.color || '#fffef8';
    if (isGradient(bg)) {
      const first = firstHexFromGradient(bg);
      return first ? autoContrastColor(first) : '#000000';
    }
    return autoContrastColor(bg);
  }

  // --- List title editing ---
  protected onListTitleChange(list: TaskList, newTitle: string): void {
    this.taskApi.updateListTitle(list.id, newTitle).subscribe({
      next: updated => {
        this.taskLists.update(current => current.map(item =>
          item.id === list.id ? { ...item, title: updated.title } : item));
      },
      error: () => { this.errorMessage = 'Could not save list name. Please try again.'; },
    });
  }

  // --- Due date popover ---
  protected openDueDatePopover(list: TaskList, task: TaskItem, event: Event): void {
    event.stopPropagation();
    if (this.dueDatePopoverTaskId === task.id) {
      this.dueDatePopoverTaskId = null;
      this.dueDatePopoverListId = null;
    } else {
      this.dueDatePopoverTaskId = task.id;
      this.dueDatePopoverListId = list.id;
      this.colorPickerListId = null;
      this.fontPickerOpen = false;
    }
  }

  protected onDueDateChange(list: TaskList, task: TaskItem, dueAt: string | null): void {
    this.taskApi.updateTaskDueDate(list.id, task.id, dueAt).subscribe({
      next: updated => {
        this.taskLists.update(current => current.map(item =>
          item.id === list.id
            ? { ...item, tasks: item.tasks.map(t => t.id === task.id ? updated : t) }
            : item));
        this.dueDatePopoverTaskId = null;
        this.dueDatePopoverListId = null;
      },
      error: () => { this.errorMessage = 'Could not save due date. Please try again.'; },
    });
  }

  protected isOverdue(task: TaskItem): boolean {
    return !task.completed && !!task.dueAt && new Date(task.dueAt) < new Date();
  }

  protected formatDueDate(dueAt: string | null | undefined): string {
    if (!dueAt) return '';
    const d = new Date(dueAt);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    if (d.toDateString() === now.toDateString()) {
      return 'Today at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    if (d.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
      ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  private saveLockerLayout(): void {
    this.lockerLayoutApi.saveLayout(this.buildLayoutItems()).subscribe({ error: () => {} });
  }

  private buildLayoutItems() {
    const cards = this.orderedCards();
    const layout = this.layoutMap();
    const heightMap = this.heightMap();
    return cards.map((card, index) => {
      const id = card.data.id;
      const pl = layout.get(id);
      // For task lists (auto-height), persist the ResizeObserver measurement so
      // shelfPack and future loads use the actual rendered height.
      const height = card.type === 'TASK_LIST'
        ? (heightMap.get(id) ?? pl?.height ?? null)
        : (pl?.height ?? null);
      return {
        cardType: card.type,
        cardId: id,
        col: 1,
        colSpan: 8,
        order: pl?.order ?? index,
        minimized: pl?.minimized ?? false,
        posX: pl?.posX ?? null,
        posY: pl?.posY ?? null,
        minHeight: null,
        width: pl?.width ?? null,
        height,
      };
    });
  }

  // ── Free-form layout helpers ──

  /** Return the layout for a card, or sensible defaults. */
  private defaultLayout(): CardLayout {
    return { posX: 0, posY: 0, width: DEFAULT_WIDGET_WIDTH, height: DEFAULT_WIDGET_HEIGHT, order: 0, minimized: false };
  }

  private getLayout(card: LockerCard): CardLayout {
    return this.layoutMap().get(card.data.id) ?? this.defaultLayout();
  }

  /**
   * Single-column reflow for narrow viewports. Only applies to widget cards —
   * stickers stay at their saved pixel positions. Reads saved posY to preserve
   * vertical order without mutating the persisted desktop layout.
   */
  private readonly singleColumnLayout = computed((): Map<string, CardLayout> | null => {
    if (!this.isNarrow()) return null;
    const cards = this.widgetCards(); // stickers excluded — they stay at saved positions
    const layoutMap = this.layoutMap();
    const heightMap = this.heightMap();
    const containerWidth = this.containerWidth();
    const w = Math.max(120, containerWidth - 32);
    const result = new Map<string, CardLayout>();
    const sorted = [...cards]
      .map(c => ({ c, pl: layoutMap.get(c.data.id) }))
      .sort((a, b) => (a.pl?.posY ?? 0) - (b.pl?.posY ?? 0));
    let y = 16;
    sorted.forEach(({ c, pl }) => {
      const h = pl?.minimized
        ? MINIMIZED_HEIGHT_PX
        : (c.type === 'TASK_LIST'
            ? (heightMap.get(c.data.id) ?? pl?.height ?? DEFAULT_WIDGET_HEIGHT)
            : (pl?.height ?? DEFAULT_WIDGET_HEIGHT));
      result.set(c.data.id, {
        posX: 16,
        posY: y,
        width: w,
        height: h,
        order: pl?.order ?? 0,
        minimized: pl?.minimized ?? false,
      });
      y += h + 16;
    });
    return result;
  });

  protected readonly gridHeight = computed(() => {
    const cards = this.orderedCards();
    const layoutMap = this.layoutMap();
    const heightMap = this.heightMap();
    if (cards.length === 0) return 400;
    let max = 0;
    cards.forEach(c => {
      const pl = layoutMap.get(c.data.id);
      if (!pl) return;
      // For task lists, prefer the ResizeObserver measurement (auto-height widget).
      const h = pl.minimized
        ? MINIMIZED_HEIGHT_PX
        : (heightMap.get(c.data.id) ?? pl.height);
      max = Math.max(max, pl.posY + h + 80);
    });
    return max;
  });

  protected getCardTop(card: LockerCard): number {
    const id = card.data.id;
    return this.singleColumnLayout()?.get(id)?.posY ?? this.layoutMap().get(id)?.posY ?? 0;
  }

  protected getCardLeft(card: LockerCard): string {
    const id = card.data.id;
    const posX = this.singleColumnLayout()?.get(id)?.posX ?? this.layoutMap().get(id)?.posX ?? 0;
    return `${posX}px`;
  }

  protected getCardWidth(card: LockerCard): string {
    const id = card.data.id;
    const w = this.singleColumnLayout()?.get(id)?.width ?? this.layoutMap().get(id)?.width ?? DEFAULT_WIDGET_WIDTH;
    return `${w}px`;
  }

  protected getCardHeight(card: LockerCard): number | null {
    const layout = this.layoutMap().get(card.data.id);
    if (layout?.minimized) return MINIMIZED_HEIGHT_PX;
    // Task lists grow to fit their content (auto-height). The height is tracked
    // via ResizeObserver and saved to DB for use by shelfPack, but is not applied
    // as an inline style so the widget expands naturally and the list scrolls internally.
    if (card.type === 'TASK_LIST') return null;
    // Stickers always need an explicit height so both dimensions are independently resizable.
    if (card.type === 'STICKER') return layout?.height ?? STICKER_DEFAULT_PX;
    return layout?.height ?? null;
  }

  /** The widgets currently held in the foreground via geometry-based hover detection. Stickers never set this. */
  protected readonly hoveredWidgetIds = signal<Set<string>>(new Set());
  protected readonly emptySet: Set<string> = new Set();

  /**
   * Geometry-based hover detection. Tests cursor position against each widget's
   * saved bounds instead of relying on pointer-events, which cause feedback loops
   * when z-index changes re-route pointer targets mid-hover.
   */
  protected onGridMouseMove(event: MouseEvent): void {
    if (this.dragCardId !== null) return; // drag system owns z-order during drag
    const container = this.gridContainerRef?.nativeElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const cx = event.clientX - rect.left;
    const cy = event.clientY - rect.top;
    const widgets = this.widgetCards();
    const layoutMap = this.layoutMap();
    const heightMap = this.heightMap();
    const hits = new Set<string>();
    for (const card of widgets) {
      const pl = layoutMap.get(card.data.id);
      if (!pl) continue;
      const w = pl.width ?? DEFAULT_WIDGET_WIDTH;
      const h = pl.minimized ? MINIMIZED_HEIGHT_PX : (pl.height ?? heightMap.get(card.data.id) ?? DEFAULT_WIDGET_HEIGHT);
      if (cx >= pl.posX && cx <= pl.posX + w && cy >= pl.posY && cy <= pl.posY + h) {
        hits.add(card.data.id);
      }
    }
    // Only update the signal if the set contents changed (avoid spurious re-renders).
    const prev = this.hoveredWidgetIds();
    if (hits.size !== prev.size || [...hits].some(id => !prev.has(id))) {
      this.hoveredWidgetIds.set(hits);
    }
  }

  protected getCardZIndex(card: LockerCard): number {
    const base = this.layoutMap().get(card.data.id)?.order ?? 0;
    if (card.type !== 'STICKER' && this.hoveredWidgetIds().has(card.data.id)) return 50 + base;
    return base;
  }

  protected getWidgetFontSize(card: LockerCard): string {
    const layout = this.layoutMap().get(card.data.id);
    const width = layout?.width ?? DEFAULT_WIDGET_WIDTH;
    // Scale font size with widget width. Clamp between 0.75rem and 1.35rem.
    const scale = Math.max(0.75, Math.min(1.35, width / DEFAULT_WIDGET_WIDTH));
    return `${scale.toFixed(3)}rem`;
  }

  protected getCardColor(card: LockerCard): string {
    if (card.type === 'TASK_LIST') return (card.data as TaskList).color || '#fffef8';
    if (card.type === 'TIMER') return (card.data as Timer).color || '#fffef8';
    if (card.type === 'NOTE') return (card.data as Note).color || '#fffef8';
    if (card.type === 'STICKER') return 'transparent';
    return '#fffef8';
  }

  protected getCardTitle(card: LockerCard): string {
    const title = (card.data as { title: string }).title ?? '';
    return card.type === 'TASK_LIST' ? `To-do: ${title}` : title;
  }

  protected isCardMinimized(card: LockerCard): boolean {
    return this.layoutMap().get(card.data.id)?.minimized ?? false;
  }

  protected toggleMinimize(card: LockerCard): void {
    const id = card.data.id;
    const current = this.layoutMap().get(id) ?? this.defaultLayout();
    const updated = new Map(this.layoutMap());
    updated.set(id, { ...current, minimized: !current.minimized });
    this.layoutMap.set(updated);
    this.saveLockerLayout();
  }

  // ── Drag-and-drop (free placement) ──

  protected onDragStart(event: MouseEvent, card: LockerCard): void {
    // Don't initiate drag if the click was on a button or input.
    if ((event.target as HTMLElement).closest('button, input, a, textarea')) return;
    const isSticker = card.type === 'STICKER';
    // Stickers are only draggable when sticker edit mode is active.
    if (isSticker && !this.stickerDialogOpen) return;
    // Non-sticker widgets only drag from their title bar.
    if (!isSticker && !(event.target as HTMLElement).closest('app-widget-title-bar')) return;

    // Sticker double-click → delete (only in sticker edit mode, checked above).
    if (isSticker) {
      const now = Date.now();
      if (
        this.lastStickerMouseDownId === card.data.id &&
        now - this.lastStickerMouseDownAt < LockerComponent.DBL_CLICK_WINDOW_MS
      ) {
        this.lastStickerMouseDownAt = 0;
        this.lastStickerMouseDownId = null;
        this.dragCardId = null;
        this.onStickerDeleted(card.data.id);
        event.preventDefault();
        return;
      }
      this.lastStickerMouseDownAt = now;
      this.lastStickerMouseDownId = card.data.id;
    }

    const container = this.gridContainerRef?.nativeElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const id = card.data.id;
    const layout = this.layoutMap().get(id) ?? this.defaultLayout();

    this.dragCardId = id;
    this.dragOffsetWithinCardX = event.clientX - rect.left - layout.posX;
    this.dragOffsetWithinCardY = event.clientY - rect.top - layout.posY;

    // Bring dragged card to the top of the z-order.
    const maxOrder = Math.max(0, ...Array.from(this.layoutMap().values()).map(l => l.order));
    if (layout.order <= maxOrder) {
      const updated = new Map(this.layoutMap());
      updated.set(id, { ...layout, order: maxOrder + 1 });
      this.layoutMap.set(updated);
    }

    event.preventDefault();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    this.handleDragMove(event);
    this.handleResizeMove(event);
  }

  private handleDragMove(event: MouseEvent): void {
    if (!this.dragCardId || !this.gridContainerRef?.nativeElement) return;
    const container = this.gridContainerRef.nativeElement;
    const rect = container.getBoundingClientRect();
    const id = this.dragCardId;
    const current = this.layoutMap().get(id) ?? this.defaultLayout();

    const snap = (v: number) => Math.round(v / GRID_SNAP_PX) * GRID_SNAP_PX;
    const newPosX = Math.max(0, snap(event.clientX - rect.left - this.dragOffsetWithinCardX));
    const newPosY = Math.max(0, snap(event.clientY - rect.top - this.dragOffsetWithinCardY));

    if (newPosX !== current.posX || newPosY !== current.posY) {
      const updated = new Map(this.layoutMap());
      updated.set(id, { ...current, posX: newPosX, posY: newPosY });
      this.layoutMap.set(updated);
    }
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    if (this.dragCardId) {
      this.dragCardId = null;
      this.saveLockerLayout();
    }
    if (this.resizeCardId) {
      this.resizeCardId = null;
      this.saveLockerLayout();
    }
  }

  // ── Resize (all sides + corners) ──

  /** Unified resize handler for all card types. */
  protected onResizeStart(event: MouseEvent, card: LockerCard, dir: string): void {
    event.stopPropagation();
    event.preventDefault();
    const isSticker = card.type === 'STICKER';
    this.resizeCardId = card.data.id;
    this.resizeDir = dir;
    this.resizeStartX = event.clientX;
    this.resizeStartY = event.clientY;
    const layout = this.getLayout(card);
    this.resizeStartPosX = layout.posX;
    this.resizeStartPosY = layout.posY;
    this.resizeStartWidth = layout.width;
    // For cards with no explicit height (auto-sized), read the rendered height from the DOM
    // so the resize starts from the actual visible size rather than 0.
    if (layout.height != null) {
      this.resizeStartHeight = layout.height;
    } else {
      const el = this.widgetElRefs.find(r => r.nativeElement.dataset['cardId'] === card.data.id)?.nativeElement;
      this.resizeStartHeight = el ? el.getBoundingClientRect().height : DEFAULT_WIDGET_HEIGHT;
    }
    this.resizeMinWidth = isSticker ? MIN_STICKER_SIZE : MIN_WIDGET_WIDTH;
    this.resizeMinHeight = isSticker ? MIN_STICKER_SIZE : MIN_WIDGET_HEIGHT;
  }

  private handleResizeMove(event: MouseEvent): void {
    if (!this.resizeCardId) return;
    const dx = event.clientX - this.resizeStartX;
    const dy = event.clientY - this.resizeStartY;
    const id = this.resizeCardId;
    const updated = new Map(this.layoutMap());
    const current = updated.get(id) ?? this.defaultLayout();
    const snap = (v: number) => Math.round(v / GRID_SNAP_PX) * GRID_SNAP_PX;
    const dir = this.resizeDir;

    let newPosX = current.posX;
    let newPosY = current.posY;
    let newWidth = current.width;
    let newHeight = current.height;

    // East: grow/shrink right edge.
    if (dir.includes('e')) {
      newWidth = Math.max(this.resizeMinWidth, snap(this.resizeStartWidth + dx));
    }
    // West: move left edge, adjust width inversely.
    if (dir.includes('w')) {
      const clampedW = Math.max(this.resizeMinWidth, snap(this.resizeStartWidth - dx));
      const delta = this.resizeStartWidth - clampedW;
      newWidth = clampedW;
      newPosX = Math.max(0, snap(this.resizeStartPosX + delta));
    }
    // South: grow/shrink bottom edge.
    if (dir.includes('s')) {
      newHeight = Math.max(this.resizeMinHeight, snap(this.resizeStartHeight + dy));
    }
    // North: move top edge, adjust height inversely.
    if (dir.includes('n')) {
      const clampedH = Math.max(this.resizeMinHeight, snap(this.resizeStartHeight - dy));
      const delta = this.resizeStartHeight - clampedH;
      newHeight = clampedH;
      newPosY = Math.max(0, snap(this.resizeStartPosY + delta));
    }

    updated.set(id, { ...current, posX: newPosX, posY: newPosY, width: newWidth, height: newHeight });
    this.layoutMap.set(updated);
  }

  /** Assign a layout entry for a newly created card. */
  private assignNewCardLayout(
    cardId: string,
    isSticker = false,
    dropCoords?: { posX: number; posY: number },
    posOverride?: { posX: number; posY: number },
  ): void {
    const maxOrder = Math.max(0, ...Array.from(this.layoutMap().values()).map(l => l.order)) + 1;
    const updated = new Map(this.layoutMap());

    if (isSticker) {
      let posX = dropCoords?.posX ?? 0;
      let posY = dropCoords?.posY ?? 0;
      if (!dropCoords) {
        const existing = this.stickerCards().length;
        posX = (existing % 6) * STICKER_DEFAULT_PX;
        posY = Math.floor(existing / 6) * STICKER_DEFAULT_PX;
      }
      updated.set(cardId, {
        posX, posY,
        width: STICKER_DEFAULT_PX,
        height: STICKER_DEFAULT_PX,
        order: maxOrder,
        minimized: false,
      });
    } else {
      // Place new widget below the lowest existing widget, unless a position is specified.
      const layouts = Array.from(updated.values());
      let posX = posOverride?.posX ?? 16;
      let posY = posOverride?.posY ?? 16;
      if (posOverride == null && layouts.length > 0) {
        const maxBottom = Math.max(...layouts.map(l => l.posY + l.height + 16));
        posY = maxBottom;
      }
      updated.set(cardId, {
        posX, posY,
        width: DEFAULT_WIDGET_WIDTH,
        height: DEFAULT_WIDGET_HEIGHT,
        order: maxOrder,
        minimized: false,
      });
    }
    this.layoutMap.set(updated);
  }

  /** Shelf-pack all widgets into a compact layout. */
  protected autoArrange(): void {
    const widgets = this.widgetCards();
    const layoutMap = this.layoutMap();
    const heightMap = this.heightMap();
    const containerWidth = this.containerWidth();

    const items: FreeItem[] = widgets.map(c => {
      const pl = layoutMap.get(c.data.id) ?? this.defaultLayout();
      // For task lists (auto-height), use the ResizeObserver measurement.
      const h = c.type === 'TASK_LIST'
        ? (heightMap.get(c.data.id) ?? pl.height)
        : pl.height;
      return { id: c.data.id, posX: pl.posX, posY: pl.posY, width: pl.width, height: h };
    });

    const packed = this.gridEngine.shelfPack(items, Math.max(300, containerWidth - 32));
    const updated = new Map(layoutMap);
    packed.forEach(p => {
      const current = updated.get(p.id) ?? this.defaultLayout();
      updated.set(p.id, { ...current, posX: p.posX, posY: p.posY });
    });
    this.layoutMap.set(updated);
    this.saveLockerLayout();
  }

  protected deleteList(list: TaskList): void {
    this.taskApi.deleteList(list.id).subscribe(() => {
      this.taskLists.update(current => current.filter(item => item.id !== list.id));
    });
  }

  protected addTask(list: TaskList): void {
    const raw = this.taskDrafts[list.id]?.trim();
    if (!raw) return;
    this.taskApi.addTask(list.id, raw).subscribe(task => {
      this.taskLists.update(current => current.map(item => item.id === list.id ? { ...item, tasks: [...item.tasks, task] } : item));
      this.taskDrafts = { ...this.taskDrafts, [list.id]: '' };
      this.focusTaskInput(list.id);
    });
  }


  protected toggleTask(list: TaskList, task: TaskItem, completed: boolean): void {
    this.taskApi.updateTask(list.id, task.id, { completed }).subscribe(updated => {
      this.taskLists.update(current =>
        current.map(item =>
          item.id === list.id
            ? { ...item, tasks: item.tasks.map(t => t.id === task.id ? updated : t) }
            : item
        )
      );
      if (updated.earnedBadge) {
        this.earnedBadges.update(current => [...current, updated.earnedBadge!]);
        this.badgeCelebration.notify(updated.earnedBadge);
      }
    });
  }

  protected clearCompleted(list: TaskList): void {
    const completed = list.tasks.filter(task => task.completed);
    if (!completed.length) return;
    forkJoin(completed.map(task => this.taskApi.deleteTask(list.id, task.id))).subscribe({
      next: () => {
        this.taskLists.update(current =>
          current.map(item => item.id === list.id ? { ...item, tasks: item.tasks.filter(t => !t.completed) } : item)
        );
        this.errorMessage = '';
      },
      error: () => { this.errorMessage = 'Unable to clean completed items right now.'; },
    });
  }

  protected removeTask(list: TaskList, task: TaskItem): void {
    this.taskApi.deleteTask(list.id, task.id).subscribe(() => {
      this.taskLists.update(current =>
        current.map(item => item.id === list.id ? { ...item, tasks: item.tasks.filter(t => t.id !== task.id) } : item)
      );
    });
  }

  protected isEditing(taskId: string): boolean { return this.editingTaskIds.has(taskId); }

  /** True when a list is in edit mode — either explicitly toggled on, or by default when empty. */
  protected isListEditMode(list: TaskList): boolean {
    const override = this.listEditModeOverrides[list.id];
    if (override !== undefined) return override;
    return list.tasks.length === 0;
  }

  protected enterListEditMode(list: TaskList): void {
    this.listEditModeOverrides[list.id] = true;
    setTimeout(() => this.tryFocusTaskInput(list.id));
  }

  protected commitListEditMode(list: TaskList): void {
    this.listEditModeOverrides[list.id] = false;
    // Close any in-flight row edits, color picker, or due-date popovers for this list.
    list.tasks.forEach(t => this.editingTaskIds.delete(t.id));
    if (this.colorPickerListId === list.id) this.colorPickerListId = null;
    if (this.dueDatePopoverListId === list.id) {
      this.dueDatePopoverListId = null;
      this.dueDatePopoverTaskId = null;
    }
  }

  protected onListKeydown(event: KeyboardEvent, list: TaskList): void {
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
    if (event.key === 'e') {
      event.preventDefault();
      this.isListEditMode(list) ? this.commitListEditMode(list) : this.enterListEditMode(list);
    } else if (event.key === 't') {
      event.preventDefault();
      this.launchTimerFromList(list);
    }
  }

  protected requestClean(list: TaskList): void {
    if (list.tasks.every(task => !task.completed)) return;
    this.confirmCleanList = list;
  }

  protected onAddInputEnter(event: Event, list: TaskList): void {
    if (this.taskDrafts[list.id]?.trim()) return; // has content — let form submit handle it
    event.preventDefault();
    this.commitListEditMode(list);
  }

  protected startEdit(task: TaskItem): void {
    this.editingTaskIds.add(task.id);
    this.editDrafts = { ...this.editDrafts, [task.id]: task.description };
    setTimeout(() => this.focusEditInput(task.id));
  }

  protected saveEdit(list: TaskList, task: TaskItem): void {
    const draft = this.editDrafts[task.id]?.trim() ?? '';
    if (!draft) {
      this.editDrafts = { ...this.editDrafts, [task.id]: task.description };
      this.editingTaskIds.delete(task.id);
      return;
    }
    if (draft === task.description) { this.editingTaskIds.delete(task.id); return; }
    this.taskApi.updateTask(list.id, task.id, { description: draft }).subscribe(updated => {
      this.taskLists.update(current =>
        current.map(item =>
          item.id === list.id
            ? { ...item, tasks: item.tasks.map(t => t.id === task.id ? updated : t) }
            : item
        )
      );
      this.editingTaskIds.delete(task.id);
    });
  }

  protected cancelEdit(task: TaskItem): void {
    this.editDrafts = { ...this.editDrafts, [task.id]: task.description };
    this.editingTaskIds.delete(task.id);
  }

  protected reorderTasks(list: TaskList, event: CdkDragDrop<TaskItem[]>): void {
    const prevOrder = [...list.tasks];
    const updatedLists = this.taskLists().map(item => {
      if (item.id !== list.id) return item;
      const tasks = [...item.tasks];
      moveItemInArray(tasks, event.previousIndex, event.currentIndex);
      return { ...item, tasks };
    });
    this.taskLists.set(updatedLists);
    const orderedIds = updatedLists.find(l => l.id === list.id)?.tasks.map(t => t.id) ?? [];
    this.taskApi.reorderTasks(list.id, orderedIds).subscribe({
      error: () => {
        this.errorMessage = 'Could not save task order. Please try again.';
        this.taskLists.set(this.taskLists().map(item => item.id === list.id ? { ...item, tasks: prevOrder } : item));
      },
    });
  }

  private focusTaskInput(listId: string): void {
    this.pendingFocusListId = listId;
    requestAnimationFrame(() => {
      if (!this.tryFocusTaskInput(listId)) setTimeout(() => this.tryFocusTaskInput(listId), 30);
    });
  }

  private tryFocusTaskInput(listId: string): boolean {
    const ref = this.taskInputRefs?.find(el => el.nativeElement.dataset['listId'] === listId);
    const target = ref?.nativeElement ?? this.taskInputRefs?.last?.nativeElement;
    if (target) { target.focus(); target.select(); this.pendingFocusListId = null; return true; }
    return false;
  }

  private focusEditInput(taskId: string): void {
    const ref = this.editInputRefs?.find(el => el.nativeElement.dataset['taskId'] === taskId);
    ref?.nativeElement.focus();
  }

  protected trackByListId(_index: number, list: TaskList): string { return list.id; }
  protected trackByCardId(_index: number, card: LockerCard): string { return card.type + ':' + card.data.id; }
  protected trackByStickerId(_index: number, sticker: Sticker): string { return sticker.id; }
  protected asTaskList(card: LockerCard): TaskList | null {
    return card.type === 'TASK_LIST' ? (card.data as TaskList) : null;
  }
  protected asNote(card: LockerCard): Note | null {
    return card.type === 'NOTE' ? (card.data as Note) : null;
  }
  protected asSticker(card: LockerCard): Sticker | null {
    return card.type === 'STICKER' ? (card.data as Sticker) : null;
  }
  protected asTimer(card: LockerCard): Timer | null {
    return card.type === 'TIMER' ? (card.data as Timer) : null;
  }

  // --- Timer launch from task list ---
  protected hasLinkedTimer(list: TaskList): boolean {
    return this.timers().some(t => t.linkedTaskListId === list.id);
  }

  protected launchTimerFromList(list: TaskList): void {
    const existing = this.timers().find(t => t.linkedTaskListId === list.id);
    if (existing) {
      setTimeout(() => this.scrollToTimer(existing.id), 0);
      return;
    }
    if (this.atTimerLimit()) return;
    const existingTitles = this.timers().map(t => t.title);
    const title = nextAutoName(existingTitles, list.title);
    this.timerApi.createTimer({ title, color: list.color, textColor: list.textColor, linkedTaskListId: list.id }).subscribe({
      next: timer => {
        this.timers.update(current => [...current, timer]);
        this.errorMessage = '';
        this.insertTimerAfterList(timer.id, list.id);
        this.assignNewCardLayout(timer.id, false, undefined, { posX: 0, posY: 0 });
        this.saveLockerLayout();
        setTimeout(() => this.scrollToTimer(timer.id), 80);
      },
      error: () => { this.errorMessage = 'Unable to create a timer right now. Please try again.'; },
    });
  }

  private insertTimerAfterList(timerId: string, listId: string): void {
    const current = this.orderedCards()
      .map(c => ({ type: c.type as 'TASK_LIST' | 'TIMER' | 'NOTE' | 'STICKER', id: c.data.id }))
      .filter(o => !(o.type === 'TIMER' && o.id === timerId));
    const listIdx = current.findIndex(o => o.type === 'TASK_LIST' && o.id === listId);
    if (listIdx !== -1) {
      current.splice(listIdx + 1, 0, { type: 'TIMER', id: timerId });
    } else {
      current.push({ type: 'TIMER', id: timerId });
    }
    this.cardOrder.set(current);
  }

  private scrollToElement(elementId: string, flashClass: string): void {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.classList.add(flashClass);
      setTimeout(() => el.classList.remove(flashClass), 900);
    }
  }

  private scrollToTimer(timerId: string): void {
    this.scrollToElement('timer-' + timerId, 'timer-flash');
  }

  protected scrollToLinkedList(timer: Timer): void {
    if (!timer.linkedTaskListId) return;
    this.scrollToElement('task-list-' + timer.linkedTaskListId, 'list-flash');
  }

  // --- Timer CRUD ---
  protected toggleTimerMenu(): void {
    if (this.atTimerLimit()) return;
    this.timerMenuOpen = !this.timerMenuOpen;

    this.shortcutsPanelOpen = false;
  }

  protected createTimer(timerType: 'POMODORO' | 'BASIC' = 'POMODORO'): void {
    this.timerMenuOpen = false;
    if (this.atTimerLimit()) return;
    if (timerType === 'BASIC' && this.hasIndependentBasicTimer()) return;
    if (timerType === 'POMODORO' && this.hasIndependentPomodoro()) return;
    const existingTitles = this.timers().map(t => t.title);
    const baseName = timerType === 'BASIC' ? 'Timer' : 'Pomodoro Timer';
    const title = nextAutoName(existingTitles, baseName);
    const savedColor = localStorage.getItem('hsht_timerColorDefault');
    const color = savedColor ?? this.nextAvailableColor();
    const req: CreateTimerRequest = { title, color, timerType };
    let hasDefaults = false;
    if (timerType === 'BASIC') {
      const saved = localStorage.getItem('hsht_basicTimerDefault');
      if (saved) { req.basicDurationSeconds = parseInt(saved, 10); hasDefaults = true; }
    } else {
      const saved = localStorage.getItem('hsht_pomodoroDefault');
      if (saved) {
        try {
          const d = JSON.parse(saved);
          req.focusDuration = d.focusDuration;
          req.shortBreakDuration = d.shortBreakDuration;
          req.longBreakDuration = d.longBreakDuration;
          req.sessionsBeforeLongBreak = d.sessionsBeforeLongBreak;
          req.presetName = d.presetName;
          hasDefaults = true;
        } catch { /* ignore corrupt data */ }
      }
    }
    this.timerApi.createTimer(req).subscribe({
      next: timer => {
        this.timers.update(current => [...current, timer]);
        this.errorMessage = '';
        this.assignNewCardLayout(timer.id, false, undefined, { posX: 0, posY: 0 });
        this.saveLockerLayout();
        setTimeout(() => this.scrollToTimer(timer.id), 80);
        // Only open config mode if no saved defaults — otherwise the timer is ready to use.
        if (!hasDefaults) {
          this.timerIdsAwaitingConfig.update(set => {
            const next = new Set(set);
            next.add(timer.id);
            return next;
          });
        }
      },
      error: () => { this.errorMessage = 'Unable to create a timer right now. Please try again.'; },
    });
  }

  protected shouldStartTimerInConfig(timerId: string): boolean {
    return this.timerIdsAwaitingConfig().has(timerId);
  }

  protected clearTimerConfigFlag(timerId: string): void {
    if (!this.timerIdsAwaitingConfig().has(timerId)) return;
    this.timerIdsAwaitingConfig.update(set => {
      const next = new Set(set);
      next.delete(timerId);
      return next;
    });
  }

  protected onTimerUpdated(updated: UpdateTimerResponse): void {
    const prev = this.timers().find(t => t.id === updated.id);
    this.timers.update(current => current.map(t => t.id === updated.id ? updated : t));
    if (updated.earnedBadge) {
      this.earnedBadges.update(current => [...current, updated.earnedBadge!]);
      this.badgeCelebration.notify(updated.earnedBadge);
    }
    // Linked timers are embedded inside their task list — no standalone grid card needed.
    // Cascade color to linked list if color changed
    if (updated.linkedTaskListId && prev?.color !== updated.color) {
      const linkedList = this.taskLists().find(l => l.id === updated.linkedTaskListId);
      if (linkedList) {
        this.taskLists.update(current => current.map(l =>
          l.id === linkedList.id ? { ...l, color: updated.color, textColor: updated.textColor ?? null } : l));
        this.taskApi.updateListColor(linkedList.id, updated.color, updated.textColor ?? null).subscribe({
          next: updatedList => this.taskLists.update(current => current.map(l => l.id === updatedList.id ? updatedList : l)),
        });
      }
    }
  }

  protected onTimerDeleted(timerId: string): void {
    this.timers.update(current => current.filter(t => t.id !== timerId));
    this.cardOrder.update(order => order.filter(o => !(o.type === 'TIMER' && o.id === timerId)));
    this.saveLockerLayout();
  }

  // --- Note CRUD ---
  protected createNote(noteType: NoteType = 'REGULAR'): void {
    if (this.atNoteLimit()) return;
    const existingTitles = this.notes().map(n => n.title);
    const title = nextAutoName(existingTitles, 'Note');
    const color = this.nextAvailableColor();
    this.noteApi.createNote({ title, color, noteType }).subscribe({
      next: note => {
        this.notes.update(current => [...current, note]);
        this.errorMessage = '';
        this.assignNewCardLayout(note.id, false, undefined, { posX: 0, posY: 0 });
        this.saveLockerLayout();
        if (note.earnedBadge) {
          this.earnedBadges.update(current => [...current, note.earnedBadge!]);
          this.badgeCelebration.notify(note.earnedBadge);
        }
      },
      error: () => { this.errorMessage = 'Unable to create a note right now. Please try again.'; },
    });
  }

  protected onNoteUpdated(updated: Note): void {
    this.notes.update(current => current.map(n => n.id === updated.id ? updated : n));
  }

  protected onNoteDeleted(noteId: string): void {
    this.notes.update(current => current.filter(n => n.id !== noteId));
    this.cardOrder.update(order => order.filter(o => !(o.type === 'NOTE' && o.id === noteId)));
    this.saveLockerLayout();
  }

  // --- Shortcut CRUD ---
  protected openAddShortcutDialog(): void {
    if (this.atShortcutLimit()) return;
    this.editingShortcut = null;
    this.shortcutUrlDraft = '';
    this.shortcutNameDraft = '';
    this.shortcutFaviconPreview = null;
    this.shortcutIconType = 'favicon';
    this.shortcutEmojiDraft = '';
    this.shortcutDialogOpen = true;
  }

  protected closeShortcutDialog(): void {
    this.shortcutDialogOpen = false;
    this.editingShortcut = null;
    this.shortcutMetadataFetching = false;
  }

  protected onShortcutDialogEnter(event: KeyboardEvent): void {
    // Don't save while the emoji picker is open (user may be navigating it)
    if (this.shortcutIconType === 'emoji' && !this.shortcutEmojiDraft) return;
    event.preventDefault();
    this.saveShortcut();
  }

  private normalizeShortcutUrl(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) return trimmed;
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }

  /** Derives the favicon URL synchronously from the domain using Google's public favicon service. */
  /** Returns a hardcoded icon for known brands (e.g. Gmail), or null. */
  private knownFaviconOverride(url: string): string | null {
    try {
      const { hostname } = new URL(url);
      return KNOWN_FAVICONS[hostname.toLowerCase()] ?? null;
    } catch {
      return null;
    }
  }

  private faviconUrlForDomain(url: string): string {
    const override = this.knownFaviconOverride(url);
    if (override) return override;
    try {
      const { origin } = new URL(url);
      return `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(origin)}`;
    } catch {
      return `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(url)}`;
    }
  }

  protected onShortcutUrlBlur(): void {
    const url = this.normalizeShortcutUrl(this.shortcutUrlDraft);
    if (!url) return;
    this.shortcutUrlDraft = url;
    // Set a preliminary favicon immediately from the entered domain.
    this.shortcutFaviconPreview = this.faviconUrlForDomain(url);
    this.shortcutFaviconCorrected = false;
    // Fetch metadata; backend returns favicon from the *final* redirected domain.
    this.fetchShortcutMetadata(url);
  }

  /** Fetches page title and the authoritative (post-redirect) favicon from the backend. */
  private fetchShortcutMetadata(url: string, then?: () => void): void {
    this.shortcutMetadataFetching = true;
    this.shortcutApi.getMetadata(url).subscribe({
      next: meta => {
        this.shortcutMetadataFetching = false;
        if (!this.shortcutNameDraft.trim()) this.shortcutNameDraft = meta.title;
        // Prefer hardcoded overrides for known brands (e.g. Gmail); otherwise
        // trust the backend's URL (computed from the final redirected domain).
        if (this.shortcutIconType === 'favicon') {
          this.shortcutFaviconPreview = this.knownFaviconOverride(url) ?? meta.faviconUrl;
        }
        this.shortcutFaviconCorrected = true;
        then?.();
      },
      error: () => { this.shortcutMetadataFetching = false; then?.(); },
    });
  }

  protected refetchShortcutMetadata(): void {
    const url = this.normalizeShortcutUrl(this.shortcutUrlDraft);
    if (!url) return;
    this.shortcutUrlDraft = url;
    // Reset to preliminary favicon while fetching.
    this.shortcutFaviconPreview = this.faviconUrlForDomain(url);
    this.shortcutFaviconCorrected = false;
    // Re-fetch metadata.
    this.shortcutMetadataFetching = true;
    this.shortcutApi.getMetadata(url).subscribe({
      next: meta => {
        this.shortcutMetadataFetching = false;
        this.shortcutNameDraft = meta.title;
        if (this.shortcutIconType === 'favicon') {
          this.shortcutFaviconPreview = this.knownFaviconOverride(url) ?? meta.faviconUrl;
        }
        this.shortcutFaviconCorrected = true;
      },
      error: () => { this.shortcutMetadataFetching = false; },
    });
  }

  protected saveShortcut(): void {
    const url = this.normalizeShortcutUrl(this.shortcutUrlDraft);
    if (!url) return;
    this.shortcutUrlDraft = url;

    // Ensure a preliminary favicon is always set synchronously.
    if (!this.shortcutFaviconPreview && this.shortcutIconType === 'favicon') {
      this.shortcutFaviconPreview = this.faviconUrlForDomain(url);
    }

    // Wait for metadata if: title is missing, OR the favicon hasn't been corrected yet
    // (backend uses the final redirected domain, e.g. gmail.com → mail.google.com).
    if (!this.shortcutNameDraft.trim() || !this.shortcutFaviconCorrected) {
      this.fetchShortcutMetadata(url, () => this.doSaveShortcut(url));
      return;
    }
    this.doSaveShortcut(url);
  }

  private doSaveShortcut(url: string): void {
    const name = this.shortcutNameDraft.trim() || undefined;
    const emoji = this.shortcutIconType === 'emoji' ? this.shortcutEmojiDraft.trim() || undefined : undefined;
    const faviconUrl = this.shortcutIconType === 'favicon' ? this.shortcutFaviconPreview || undefined : undefined;

    if (this.editingShortcut) {
      const shortcutName = name || this.editingShortcut.name;
      this.shortcutApi.updateShortcut(this.editingShortcut.id, {
        url,
        name: shortcutName,
        faviconUrl: faviconUrl ?? null,
        emoji: emoji ?? null,
      }).subscribe({
        next: updated => {
          this.shortcuts.update(current => current.map(s => s.id === updated.id ? updated : s));
          this.closeShortcutDialog();
        },
        error: () => { this.errorMessage = 'Unable to update shortcut. Please try again.'; },
      });
    } else {
      this.shortcutApi.createShortcut({ url, name, faviconUrl, emoji }).subscribe({
        next: created => {
          this.shortcuts.update(current => [...current, created]);
          this.errorMessage = '';
          this.closeShortcutDialog();
        },
        error: () => { this.errorMessage = 'Unable to add shortcut. Please try again.'; },
      });
    }
  }

  protected onShortcutEditRequested(shortcut: Shortcut): void {
    this.editingShortcut = shortcut;
    this.shortcutUrlDraft = shortcut.url;
    this.shortcutNameDraft = shortcut.name;
    this.shortcutFaviconPreview = shortcut.faviconUrl ?? null;
    this.shortcutFaviconCorrected = true; // existing shortcut already has a saved favicon
    this.shortcutIconType = shortcut.emoji ? 'emoji' : 'favicon';
    this.shortcutEmojiDraft = shortcut.emoji ?? '';
    this.shortcutDialogOpen = true;
  }

  protected reorderShortcuts(event: CdkDragDrop<Shortcut[]>): void {
    const prev = [...this.shortcuts()];
    const next = [...prev];
    moveItemInArray(next, event.previousIndex, event.currentIndex);
    this.shortcuts.set(next);
    this.shortcutApi.reorderShortcuts(next.map(s => s.id)).subscribe({
      error: () => this.shortcuts.set(prev), // revert on failure
    });
  }

  protected onShortcutDeleteRequested(shortcut: Shortcut): void {
    this.confirmDeleteShortcut = shortcut;
  }

  protected onConfirmDeleteShortcut(): void {
    const shortcut = this.confirmDeleteShortcut;
    if (!shortcut) return;
    this.confirmDeleteShortcut = null;
    this.shortcutApi.deleteShortcut(shortcut.id).subscribe({
      next: () => {
        this.shortcuts.update(current => current.filter(s => s.id !== shortcut.id));
      },
      error: () => { this.errorMessage = 'Unable to delete shortcut. Please try again.'; },
    });
  }

  protected onTimerTaskCheckChange(event: { taskId: string; listId: string; completed: boolean }): void {
    this.taskApi.updateTask(event.listId, event.taskId, { completed: event.completed }).subscribe(updated => {
      this.taskLists.update(current => current.map(list =>
        list.id === event.listId
          ? { ...list, tasks: list.tasks.map(t => t.id === event.taskId ? updated : t) }
          : list
      ));
    });
  }

  protected handleLogout(): void {
    this.sessionStore.clearSession();
    this.router.navigate(['/']);
  }

  // --- Sticker CRUD ---
  protected toggleStickerPanel(): void {
    this.stickerDialogOpen = !this.stickerDialogOpen;
    if (this.stickerDialogOpen) {
      this.fontPickerOpen = false;
      this.shortcutsPanelOpen = false;
      this.quotePanelOpen = false;
      this.badgeShelfOpen = false;
      this.colorPickerListId = null;
    }
  }

  protected closeStickerDialog(): void {
    this.stickerDialogOpen = false;
  }

  protected onStickerDialogEmojiSelected(emoji: string): void {
    this.createStickerAt(emoji);
  }

  /**
   * Create a sticker. If `dropCoords` is provided (in pixels relative to the
   * grid container), the sticker is placed at that exact position.
   * Otherwise it cascades from existing stickers.
   */
  private createStickerAt(emoji: string, dropCoords?: { posX: number; posY: number }): void {
    if (this.atStickerLimit()) return;
    this.stickerApi.createSticker({ emoji, iconUrl: null, label: null }).subscribe({
      next: sticker => {
        this.stickers.update(current => [...current, sticker]);
        if (sticker.earnedBadge) {
          this.earnedBadges.update(current => [...current, sticker.earnedBadge!]);
          this.badgeCelebration.notify(sticker.earnedBadge);
        }
        this.errorMessage = '';
        this.assignNewCardLayout(sticker.id, true, dropCoords);
        this.saveLockerLayout();
        // Keep panel open so user can add multiple stickers
      },
      error: () => { this.errorMessage = 'Unable to add sticker. Please try again.'; },
    });
  }

  /** Allow emoji-picker drags to be dropped onto the grid container. */
  protected onGridDragOver(event: DragEvent): void {
    if (!event.dataTransfer) return;
    const types = Array.from(event.dataTransfer.types);
    if (types.includes(EmojiPickerComponent.DRAG_MIME) || types.includes('text/plain')) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  /** Drop handler: extract the emoji from the drag data and create a sticker at the drop location. */
  protected onGridDrop(event: DragEvent): void {
    const dt = event.dataTransfer;
    if (!dt) return;
    const emoji = dt.getData(EmojiPickerComponent.DRAG_MIME) || dt.getData('text/plain');
    if (!emoji) return;
    event.preventDefault();

    const container = this.gridContainerRef?.nativeElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    // Center the new sticker on the cursor for a natural drop feel.
    const posX = event.clientX - rect.left - STICKER_DEFAULT_PX / 2;
    const posY = event.clientY - rect.top - STICKER_DEFAULT_PX / 2;
    this.createStickerAt(emoji, { posX: Math.max(0, posX), posY: Math.max(0, posY) });
  }

  protected onStickerDeleted(id: string): void {
    this.stickers.update(current => current.filter(s => s.id !== id));
    this.cardOrder.update(order => order.filter(o => !(o.type === 'STICKER' && o.id === id)));
    this.stickerApi.deleteSticker(id).subscribe();
    this.saveLockerLayout();
  }

private nextAvailableColor(): string {
    const lockerSolid = this.lockerColor().doorSolid;
    const used = new Set([
      ...this.taskLists().map(l => l.color),
      ...this.timers().map(t => t.color),
      ...this.notes().map(n => n.color),
    ]);
    const candidates = this.colorPalette.filter((c: string) => !used.has(c) && c !== lockerSolid);
    const hex = candidates.length > 0
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : (() => {
          const nonLocker = this.colorPalette.filter((c: string) => c !== lockerSolid);
          const pool = nonLocker.length > 0 ? nonLocker : this.colorPalette;
          return pool[Math.floor(Math.random() * pool.length)];
        })();
    return `linear-gradient(to bottom, #ffffff, ${hex})`;
  }
}
