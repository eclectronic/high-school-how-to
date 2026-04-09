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
import { TimerApiService, UpdateTimerResponse } from '../../../core/services/timer-api.service';
import { NoteApiService } from '../../../core/services/note-api.service';
import { LockerLayoutApiService } from '../../../core/services/locker-layout-api.service';
import { ShortcutApiService } from '../../../core/services/shortcut-api.service';
import { BadgeApiService } from '../../../core/services/badge-api.service';
import { BadgeCelebrationService } from '../../../shared/badge-celebration/badge-celebration.service';
import { BadgeCelebrationComponent } from '../../../shared/badge-celebration/badge-celebration.component';
import { BadgeShelfComponent } from '../../../shared/badge-shelf/badge-shelf.component';
import { LockerGridEngineService } from '../../../core/services/locker-grid-engine.service';
import { SessionStore } from '../../../core/session/session.store';
import { TaskItem, TaskList, Timer, Note, Shortcut, Sticker, EarnedBadge, NoteType } from '../../../core/models/task.models';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { InlineTitleEditComponent } from '../../../shared/inline-title-edit/inline-title-edit.component';
import { ColorPickerComponent } from '../../../shared/color-picker/color-picker.component';
import { DueDatePopoverComponent } from '../../../shared/due-date-popover/due-date-popover.component';
import { TimerCardComponent } from '../../../shared/timer-card/timer-card.component';
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
  | { type: 'SHORTCUT'; data: Shortcut }
  | { type: 'STICKER'; data: Sticker };

interface CardLayout {
  col: number;
  colSpan: number;
  order: number;
  minimized: boolean;
}

const DEFAULT_COL_SPAN = 4;
const DESKTOP_COLS = 12;
const TABLET_COLS = 6;
const MOBILE_COLS = 1;

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
];

/** Auto-naming convention: "To-dos", "To-dos #2", "To-dos #3", gap-filling */
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
    ConfirmDialogComponent, InlineTitleEditComponent, ColorPickerComponent, DueDatePopoverComponent,
    TimerCardComponent, NoteCardComponent, ShortcutIconComponent, EmojiPickerComponent,
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
            <span class="app-icon-btn__label">Add list</span>
          </button>
          <button type="button" class="app-icon-btn"
                  [disabled]="atTimerLimit()"
                  [title]="atTimerLimit() ? 'Maximum of 10 timers reached' : 'Create a Pomodoro timer'"
                  (click)="createTimer()" aria-label="Create new timer">
            <span class="app-icon-btn__icon">⏱</span>
            <span class="app-icon-btn__label">Add timer</span>
          </button>
          <div style="position:relative;display:inline-block">
            <button type="button" class="app-icon-btn"
                    [disabled]="atNoteLimit()"
                    [title]="atNoteLimit() ? 'Maximum of 20 notes reached' : 'Create a note'"
                    (click)="toggleNoteMenu(); $event.stopPropagation()" aria-label="Create new note">
              📝
            </button>
            <div *ngIf="noteMenuOpen" class="note-submenu" (click)="$event.stopPropagation()">
              <button type="button" class="note-submenu__item" (click)="createNote('REGULAR')">
                📝 Blank Note
              </button>
              <button type="button" class="note-submenu__item"
                      [disabled]="hasQuoteNote()"
                      [title]="hasQuoteNote() ? 'You already have a Quote of the Day note.' : 'Create a Quote of the Day note'"
                      (click)="createNote('QUOTE')">
                💬 Quote of the Day
              </button>
            </div>
          </div>
          <button type="button" class="app-icon-btn"
                  [disabled]="atShortcutLimit()"
                  [title]="atShortcutLimit() ? 'Maximum of 50 shortcuts reached' : 'Add a shortcut'"
                  (click)="openAddShortcutDialog(); $event.stopPropagation()" aria-label="Add a shortcut">
            🚀
          </button>
          <button type="button" class="app-icon-btn"
                  *ngIf="studyReadyTimers().length > 0"
                  title="Enter Study Session"
                  (click)="enterStudySessionFromBar()" aria-label="Enter Study Session">
            <span class="app-icon-btn__icon">📚</span>
            <span class="app-icon-btn__label">Study</span>
          </button>
          <button type="button" class="app-icon-btn"
                  [disabled]="atStickerLimit()"
                  [title]="atStickerLimit() ? 'Maximum of 50 stickers reached' : 'Add a sticker'"
                  (click)="openStickerDialog(); $event.stopPropagation()" aria-label="Add sticker">
            <span class="app-icon-btn__icon">🏷️</span>
            <span class="app-icon-btn__label">Stickers</span>
          </button>
          <button type="button" class="app-icon-btn app-icon-btn--font"
                  [title]="'Locker font: ' + lockerFont().name"
                  (click)="toggleFontPicker(); $event.stopPropagation()" aria-label="Change locker font">
            <span class="app-icon-btn__icon">Aa</span>
            <span class="app-icon-btn__label">Font</span>
          </button>
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
        <!-- Add Sticker dialog -->
        <div *ngIf="stickerDialogOpen" class="sticker-dialog" (click)="$event.stopPropagation()">
          <h3 class="sticker-dialog__title">{{ stickerEditId ? 'Edit Sticker' : 'Add Sticker' }}</h3>
          <div class="sticker-dialog__tabs">
            <button type="button" class="sticker-dialog__tab"
                    [class.sticker-dialog__tab--active]="stickerDialogTab === 'emoji'"
                    (click)="stickerDialogTab = 'emoji'">Emoji</button>
            <button type="button" class="sticker-dialog__tab"
                    [class.sticker-dialog__tab--active]="stickerDialogTab === 'url'"
                    (click)="stickerDialogTab = 'url'">Image URL</button>
          </div>
          @if (stickerDialogTab === 'emoji') {
            <app-emoji-picker
              (emojiSelected)="onStickerDialogEmojiSelected($event)"
            ></app-emoji-picker>
            <div class="sticker-dialog__selected-emoji" *ngIf="stickerDialogEmoji">
              Selected: <span>{{ stickerDialogEmoji }}</span>
            </div>
          } @else {
            <div class="sticker-dialog__field">
              <label class="sticker-dialog__label">Image URL</label>
              <input type="text" class="sticker-dialog__input"
                     [(ngModel)]="stickerDialogIconUrl"
                     placeholder="/media/icons/my-icon.png" />
            </div>
          }
          <div class="sticker-dialog__field">
            <label class="sticker-dialog__label">Label (optional)</label>
            <input type="text" class="sticker-dialog__input"
                   [(ngModel)]="stickerDialogLabel"
                   maxlength="255"
                   placeholder="My favorite sticker" />
          </div>
          <div class="sticker-dialog__actions">
            <button type="button" class="sticker-dialog__btn sticker-dialog__btn--cancel"
                    (click)="closeStickerDialog()">Cancel</button>
            <button type="button" class="sticker-dialog__btn sticker-dialog__btn--submit"
                    [disabled]="!canSubmitStickerDialog()"
                    (click)="submitStickerDialog()">
              {{ stickerEditId ? 'Save' : 'Add' }}
            </button>
          </div>
        </div>
        <p *ngIf="errorMessage" class="error">{{ errorMessage }}</p>
      </header>

      <!-- Add / Edit Shortcut dialog -->
      <div *ngIf="shortcutDialogOpen"
           class="shortcut-dialog-backdrop"
           (click)="closeShortcutDialog()">
        <div class="shortcut-dialog" (click)="$event.stopPropagation()">
          <h3 class="shortcut-dialog__title">{{ editingShortcut ? 'Edit Shortcut' : 'Add Shortcut' }}</h3>

          <label class="shortcut-dialog__label">URL</label>
          <input class="shortcut-dialog__input"
                 type="url"
                 [(ngModel)]="shortcutUrlDraft"
                 placeholder="https://example.com"
                 (blur)="onShortcutUrlBlur()"
                 (keydown.enter)="onShortcutUrlBlur()" />

          <label class="shortcut-dialog__label">
            Name
            <span class="shortcut-dialog__hint">(auto-filled from page title)</span>
          </label>
          <input class="shortcut-dialog__input"
                 type="text"
                 [(ngModel)]="shortcutNameDraft"
                 placeholder="Site name"
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
              <input *ngIf="shortcutIconType === 'emoji'"
                     class="shortcut-dialog__emoji-input"
                     type="text"
                     [(ngModel)]="shortcutEmojiDraft"
                     placeholder="😀"
                     maxlength="10" />
            </label>
          </div>

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

      <!-- Badge shelf -->
      <app-badge-shelf [badges]="earnedBadges()"></app-badge-shelf>

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

      <!-- ── Study Session View ── -->
      <div class="study-session" *ngIf="studySession() && studySessionTimer() && studySessionList()" (click)="$event.stopPropagation()">
        <div class="study-session__header">
          <button type="button" class="study-session__back" (click)="exitStudySession()">← Back to Locker</button>
          <h2 class="study-session__title">Study Session</h2>
        </div>
        <div class="study-session__panels">
          <!-- Left: task list -->
          <div class="study-panel study-panel--list"
               [style.background]="studySessionList()!.color || '#fffef8'"
               [style.color]="cardTextColor(studySessionList()!)">
            <h3 class="study-panel__title">{{ studySessionList()!.title }}</h3>
            <ul class="study-task-list">
              <li *ngFor="let task of studySessionList()!.tasks"
                  class="study-task"
                  [class.study-task--done]="task.completed">
                <input type="checkbox"
                       [checked]="task.completed"
                       (change)="toggleTask(studySessionList()!, task, $any($event.target).checked)" />
                <span class="study-task__text" [class.study-task__text--done]="task.completed">{{ task.description }}</span>
              </li>
            </ul>
            <form class="study-new-task" (ngSubmit)="addTask(studySessionList()!)">
              <input #taskInput
                     [attr.data-list-id]="studySessionList()!.id"
                     [name]="'task-study-' + studySessionList()!.id"
                     [(ngModel)]="taskDrafts[studySessionList()!.id]"
                     placeholder="Add a to-do…"
                     required />
              <button type="submit" [disabled]="!taskDrafts[studySessionList()!.id]?.trim()">Add</button>
            </form>
          </div>
          <!-- Right: timer -->
          <div class="study-panel study-panel--timer">
            <app-timer-card
              [timer]="studySessionTimer()!"
              [taskLists]="taskLists()"
              (timerUpdated)="onTimerUpdated($event)"
              (timerDeleted)="onTimerDeleted($event); exitStudySession()"
              (taskCheckChange)="onTimerTaskCheckChange($event)"
            ></app-timer-card>
          </div>
        </div>
      </div>

      <!-- ── Normal grid ── -->
      <div class="lists"
           #gridContainer
           *ngIf="!studySession() && orderedCards().length"
           [style.height.px]="gridHeight()">
        <div
          *ngFor="let card of orderedCards(); trackBy: trackByCardId"
          class="grid-widget"
          [class.grid-widget--minimized]="isCardMinimized(card)"
          [class.grid-widget--dragging]="dragCardId === card.data.id"
          [style.top.px]="getCardTop(card)"
          [style.left]="getCardLeft(card)"
          [style.width]="getCardWidth(card)"
          (mousedown)="onDragStart($event, card)"
          [style.background]="getCardColor(card)"
        >
          <!-- Widget title bar (drag handle) -->
          <app-widget-title-bar
            [title]="getCardTitle(card)"
            [minimized]="isCardMinimized(card)"
            (minimizeToggled)="toggleMinimize(card)"
          ></app-widget-title-bar>

          <!-- Widget body (hidden when minimized) -->
          <div class="widget-body" *ngIf="!isCardMinimized(card)">

          <!-- Timer card -->
          <app-timer-card
            *ngIf="card.type === 'TIMER'"
            [attr.id]="'timer-' + card.data.id"
            [timer]="card.data"
            [taskLists]="taskLists()"
            (timerUpdated)="onTimerUpdated($event)"
            (timerDeleted)="onTimerDeleted($event)"
            (taskCheckChange)="onTimerTaskCheckChange($event)"
            (studySessionRequested)="enterStudySession(card.data.id)"
          ></app-timer-card>

          <!-- Note card -->
          <app-note-card
            *ngIf="card.type === 'NOTE'"
            [note]="asNote(card)!"
            (noteUpdated)="onNoteUpdated($event)"
            (noteDeleted)="onNoteDeleted($event)"
          ></app-note-card>

          <!-- Shortcut card -->
          <app-shortcut-icon
            *ngIf="card.type === 'SHORTCUT'"
            [shortcut]="asShortcut(card)!"
            (editRequested)="onShortcutEditRequested($event)"
            (deleteRequested)="onShortcutDeleteRequested($event)"
          ></app-shortcut-icon>

          <!-- Sticker card -->
          <app-sticker-icon
            *ngIf="card.type === 'STICKER'"
            [sticker]="asSticker(card)!"
            (edit)="openEditStickerDialog(asSticker(card)!)"
            (delete)="onStickerDeleted(asSticker(card)!.id)"
          ></app-sticker-icon>

          <!-- Task list card -->
          <ng-container *ngIf="asTaskList(card) as list">
          <article
            class="list-card"
            [style.background]="list.color || '#fffef8'"
            [style.color]="cardTextColor(list)"
            [class.list-card--elevated]="dueDatePopoverListId === list.id || colorPickerListId === list.id"
            (click)="$event.stopPropagation()"
          >
            <header class="list-card__header">
              <app-inline-title-edit
                [title]="list.title"
                (titleChange)="onListTitleChange(list, $event)"
              ></app-inline-title-edit>
              <div class="list-actions">
                <button type="button" class="ghost clean" (click)="requestClean(list)"><span class="clean__label">Clean</span></button>
                <button type="button" class="ghost danger" (click)="requestDelete(list)">Delete</button>
                <button
                  type="button"
                  class="icon-button"
                  [class.palette]="!hasLinkedTimer(list)"
                  [disabled]="!hasLinkedTimer(list) && atTimerLimit()"
                  [title]="hasLinkedTimer(list) ? 'Go to linked timer' : atTimerLimit() ? 'Timer limit reached' : 'Start a Pomodoro timer for this list'"
                  aria-label="Launch Pomodoro timer for this list"
                  (click)="launchTimerFromList(list); $event.stopPropagation()"
                >⏱</button>
                <button
                  type="button"
                  class="icon-button palette"
                  aria-label="List color settings"
                  (click)="toggleColorPicker(list, $event)"
                >
                  <span aria-hidden="true">🎨</span>
                </button>
              </div>
              <div
                class="color-picker-panel floating"
                *ngIf="colorPickerListId === list.id"
                (click)="$event.stopPropagation()"
              >
                <app-color-picker
                  [selectedColor]="list.color"
                  [selectedTextColor]="list.textColor ?? null"
                  (colorChange)="onCardColorChange(list, $event)"
                  (textColorChange)="onCardTextColorChange(list, $event)"
                ></app-color-picker>
                <button type="button" class="ghost" style="margin-top:0.5rem" (click)="saveCardColor(list)">Done</button>
              </div>
            </header>

            <ul class="task-list" cdkDropList (cdkDropListDropped)="reorderTasks(list, $event)">
              <li *ngFor="let task of list.tasks" cdkDrag cdkDragLockAxis="y">
                <span class="drag-handle" cdkDragHandle aria-label="Drag to reorder">☰</span>
                <div class="task-row" *ngIf="!isEditing(task.id); else editRow">
                  <input
                    type="checkbox"
                    [checked]="task.completed"
                    (change)="toggleTask(list, task, $any($event.target).checked)"
                    aria-label="Mark task complete"
                  />
                  <div class="task-content">
                    <div class="task-main-row">
                      <button
                        type="button"
                        class="task-text"
                        [class.completed]="task.completed"
                        (click)="startEdit(task)"
                      >
                        {{ task.description }}
                      </button>
                      <button type="button" class="calendar-icon-btn"
                              (click)="openDueDatePopover(list, task, $event)"
                              title="Set due date" aria-label="Set due date">🗓</button>
                    </div>
                    <div class="task-due" *ngIf="task.dueAt">
                      <button type="button"
                              class="due-date-btn"
                              [class.due-date-btn--overdue]="isOverdue(task)"
                              (click)="openDueDatePopover(list, task, $event)">
                        Due: {{ formatDueDate(task.dueAt) }}
                      </button>
                    </div>
                  </div>
                  <button type="button" class="icon-button danger" (click)="removeTask(list, task)" aria-label="Remove task">
                    ×
                  </button>
                </div>

                <!-- Due date popover -->
                <div class="due-date-popover-wrap" *ngIf="dueDatePopoverTaskId === task.id"
                     (click)="$event.stopPropagation()">
                  <app-due-date-popover
                    [dueAt]="task.dueAt ?? null"
                    (dueAtChange)="onDueDateChange(list, task, $event)"
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
                      (blur)="saveEdit(list, task)"
                    />
                    <button type="button" class="ghost" (click)="removeTask(list, task)">Remove</button>
                  </div>
                </ng-template>
              </li>
            </ul>

            <form class="new-task" (ngSubmit)="addTask(list)" #taskForm="ngForm">
              <input
                #taskInput
                [attr.data-list-id]="list.id"
                name="task-{{ list.id }}"
                [(ngModel)]="taskDrafts[list.id]"
                placeholder="Add a to-do…"
                required
              />
              <button type="submit" [disabled]="!taskDrafts[list.id]?.trim()">Add</button>
            </form>
          </article>
          </ng-container>

          </div><!-- /widget-body -->

          <!-- Right-edge resize handle -->
          <div class="widget-resize-handle"
               (mousedown)="onResizeStart($event, card)"
               title="Drag to resize"></div>
        </div>
      </div>

      <!-- Empty state -->
      <div class="empty-card" *ngIf="!studySession() && !orderedCards().length">
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
  protected stickerEditId: string | null = null;
  protected stickerDialogTab: 'emoji' | 'url' = 'emoji';
  protected stickerDialogEmoji = '';
  protected stickerDialogIconUrl = '';
  protected stickerDialogLabel = '';
  protected taskDrafts: Record<string, string> = {};
  protected errorMessage = '';
  protected editDrafts: Record<string, string> = {};

  protected readonly colorPalette = DEFAULT_PALETTE;

  private readonly editingTaskIds = new Set<string>();
  protected colorDrafts: Record<string, string> = {};
  protected colorOriginals: Record<string, string> = {};

  // Minimized state for task list cards (by list id)
  protected minimizedLists: Record<string, boolean> = {};

  // New Phase 1 state
  protected colorPickerListId: string | null = null;
  protected colorDraftTextColors: Record<string, string | null> = {};
  protected confirmDeleteList: TaskList | null = null;
  protected confirmCleanList: TaskList | null = null;
  protected dueDatePopoverTaskId: string | null = null;
  protected dueDatePopoverListId: string | null = null;
  protected fontPickerOpen = false;

  // Shortcut dialog state
  protected shortcutDialogOpen = false;
  protected editingShortcut: Shortcut | null = null;
  protected shortcutUrlDraft = '';
  protected shortcutNameDraft = '';
  protected shortcutFaviconPreview: string | null = null;
  protected shortcutIconType: 'favicon' | 'emoji' = 'favicon';
  protected shortcutEmojiDraft = '';
  protected confirmDeleteShortcut: Shortcut | null = null;
  protected noteMenuOpen = false;

  protected readonly atListLimit = computed(() => this.taskLists().length >= 20);
  protected readonly atTimerLimit = computed(() => this.timers().length >= 10);
  protected readonly atNoteLimit = computed(() => this.notes().length >= 20);
  protected readonly atShortcutLimit = computed(() => this.shortcuts().length >= 50);
  protected readonly atStickerLimit = computed(() => this.stickers().length >= 50);
  protected readonly hasQuoteNote = computed(() => this.notes().some(n => n.noteType === 'QUOTE'));

  protected readonly studySession = signal<{ timerId: string; listId: string } | null>(null);
  protected readonly studySessionTimer = computed(() =>
    this.timers().find(t => t.id === this.studySession()?.timerId) ?? null
  );
  protected readonly studySessionList = computed(() =>
    this.taskLists().find(l => l.id === this.studySession()?.listId) ?? null
  );
  protected readonly studyReadyTimers = computed(() =>
    this.timers().filter(t => t.linkedTaskListId && this.taskLists().some(l => l.id === t.linkedTaskListId))
  );

  private readonly cardOrder = signal<Array<{ type: 'TASK_LIST' | 'TIMER' | 'NOTE' | 'SHORTCUT' | 'STICKER'; id: string }>>([]);

  // ── Pinnable layout state ──
  /** Per-card placement: col (1-based), colSpan, order, minimized. */
  private readonly layoutMap = signal<Map<string, CardLayout>>(new Map());
  /** Current column count based on container width. */
  private readonly columnCount = signal<number>(DESKTOP_COLS);
  /** Measured heights per card id (set by ResizeObserver). */
  private readonly heightMap = signal<Map<string, number>>(new Map());
  /** Grid container element ref for width measurement. */
  @ViewChild('gridContainer') private gridContainerRef?: ElementRef<HTMLElement>;
  private resizeObserver?: ResizeObserver;

  /** Drag state */
  protected dragCardId: string | null = null;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragStartCol = 1;
  private dragStartOrder = 0;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  /** Resize state */
  private resizeCardId: string | null = null;
  private resizeStartX = 0;
  private resizeStartColSpan = 1;
  private resizeColumnWidth = 0;

  protected readonly orderedCards = computed((): LockerCard[] => {
    const lists = this.taskLists();
    const timers = this.timers();
    const notes = this.notes();
    const shortcuts = this.shortcuts();
    const stickers = this.stickers();
    const order = this.cardOrder();
    const listMap = new Map(lists.map(l => [l.id, l]));
    const timerMap = new Map(timers.map(t => [t.id, t]));
    const noteMap = new Map(notes.map(n => [n.id, n]));
    const shortcutMap = new Map(shortcuts.map(s => [s.id, s]));
    const stickerMap = new Map(stickers.map(s => [s.id, s]));
    if (order.length === 0) {
      return [
        ...lists.map(l => ({ type: 'TASK_LIST' as const, data: l })),
        ...timers.map(t => ({ type: 'TIMER' as const, data: t })),
        ...notes.map(n => ({ type: 'NOTE' as const, data: n })),
        ...shortcuts.map(s => ({ type: 'SHORTCUT' as const, data: s })),
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
        if (timer) result.push({ type: 'TIMER', data: timer });
      } else if (type === 'NOTE') {
        const note = noteMap.get(id);
        if (note) result.push({ type: 'NOTE', data: note });
      } else if (type === 'SHORTCUT') {
        const shortcut = shortcutMap.get(id);
        if (shortcut) result.push({ type: 'SHORTCUT', data: shortcut });
      } else if (type === 'STICKER') {
        const sticker = stickerMap.get(id);
        if (sticker) result.push({ type: 'STICKER', data: sticker });
      }
    });
    // Append newly created cards not yet in saved order
    lists.forEach(l => { if (!order.find(o => o.type === 'TASK_LIST' && o.id === l.id)) result.push({ type: 'TASK_LIST', data: l }); });
    timers.forEach(t => { if (!order.find(o => o.type === 'TIMER' && o.id === t.id)) result.push({ type: 'TIMER', data: t }); });
    notes.forEach(n => { if (!order.find(o => o.type === 'NOTE' && o.id === n.id)) result.push({ type: 'NOTE', data: n }); });
    shortcuts.forEach(s => { if (!order.find(o => o.type === 'SHORTCUT' && o.id === s.id)) result.push({ type: 'SHORTCUT', data: s }); });
    stickers.forEach(s => { if (!order.find(o => o.type === 'STICKER' && o.id === s.id)) result.push({ type: 'STICKER', data: s }); });
    return result;
  });

  @ViewChildren('taskInput') private taskInputRefs!: QueryList<ElementRef<HTMLInputElement>>;
  @ViewChildren('editInput') private editInputRefs!: QueryList<ElementRef<HTMLInputElement>>;
  private pendingFocusListId: string | null = null;

  protected readonly earnedBadges = signal<EarnedBadge[]>([]);

  constructor(
    private readonly taskApi: TaskApiService,
    private readonly timerApi: TimerApiService,
    private readonly noteApi: NoteApiService,
    private readonly shortcutApi: ShortcutApiService,
    private readonly stickerApi: StickerApiService,
    private readonly lockerLayoutApi: LockerLayoutApiService,
    private readonly badgeApi: BadgeApiService,
    private readonly badgeCelebration: BadgeCelebrationService,
  ) {
    effect(() => { this.loadCards(); });
  }

  ngOnInit(): void {
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
    if (savedFont.googleFont) this.loadGoogleFont(savedFont);

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

    // Observe container width changes to update column count.
    if (typeof ResizeObserver !== 'undefined' && this.gridContainerRef?.nativeElement) {
      this.resizeObserver = new ResizeObserver((entries) => {
        const width = entries[0]?.contentRect.width ?? 0;
        const cols = width >= 1024 ? DESKTOP_COLS : width >= 600 ? TABLET_COLS : MOBILE_COLS;
        if (cols !== this.columnCount()) {
          this.columnCount.set(cols);
        }
      });
      this.resizeObserver.observe(this.gridContainerRef.nativeElement);
    }
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
    if (font.googleFont) this.loadGoogleFont(font);
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
    const name = font.name.replace(/ /g, '+');
    const id = `gfont-${font.id}`;
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${name}&display=swap`;
      document.head.appendChild(link);
    }
  }

  protected toggleFontPicker(): void {
    this.fontPickerOpen = !this.fontPickerOpen;
    this.colorPickerListId = null;
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

        // Apply saved layout into layoutMap and cardOrder
        if (layout.length > 0) {
          const newMap = new Map<string, CardLayout>();
          const newOrder: Array<{ type: 'TASK_LIST' | 'TIMER' | 'NOTE' | 'SHORTCUT' | 'STICKER'; id: string }> = [];
          layout.forEach((item) => {
            newMap.set(item.cardId, {
              col: item.col,
              colSpan: item.colSpan,
              order: item.order,
              minimized: item.minimized,
            });
            newOrder.push({ type: item.cardType as 'TASK_LIST' | 'TIMER' | 'NOTE' | 'SHORTCUT' | 'STICKER', id: item.cardId });
          });
          this.layoutMap.set(newMap);
          this.cardOrder.set(newOrder);
        }
      },
      error: () => { this.errorMessage = 'Could not load your locker. Please log in again.'; },
    });
  }

  protected closeConfig(): void {
    this.colorPickerListId = null;
    this.fontPickerOpen = false;
    this.dueDatePopoverTaskId = null;
    this.dueDatePopoverListId = null;
    this.noteMenuOpen = false;
  }

  protected createList(): void {
    if (this.atListLimit()) return;
    const existingTitles = this.taskLists().map(l => l.title);
    const title = nextAutoName(existingTitles, 'To-dos');
    const color = this.nextAvailableColor();
    this.taskApi.createList(title, color).subscribe({
      next: list => {
        this.taskLists.update(current => [...current, { ...list }]);
        this.errorMessage = '';
        this.assignNewCardLayout(list.id);
        this.saveLockerLayout();
      },
      error: () => { this.errorMessage = 'Unable to add a list right now. Please try again or sign in again.'; },
    });
  }

  // --- Delete and Clean confirmation (new ConfirmDialogComponent-based) ---
  protected requestDelete(list: TaskList): void {
    this.confirmDeleteList = list;
  }

  protected onConfirmDeleteList(): void {
    if (this.confirmDeleteList) this.deleteList(this.confirmDeleteList);
    this.confirmDeleteList = null;
  }

  protected onCancelDeleteList(): void {
    this.confirmDeleteList = null;
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
      this.colorDraftTextColors = { ...this.colorDraftTextColors, [list.id]: list.textColor ?? null };
      this.fontPickerOpen = false;
    }
  }

  protected onCardColorChange(list: TaskList, color: string): void {
    this.colorDrafts = { ...this.colorDrafts, [list.id]: color };
    this.taskLists.update(current => current.map(item => item.id === list.id ? { ...item, color } : item));
    this.timers.update(current => current.map(t => t.linkedTaskListId === list.id ? { ...t, color } : t));
  }

  protected onCardTextColorChange(list: TaskList, textColor: string | null): void {
    this.colorDraftTextColors = { ...this.colorDraftTextColors, [list.id]: textColor };
    this.taskLists.update(current => current.map(item => item.id === list.id ? { ...item, textColor } : item));
    this.timers.update(current => current.map(t => t.linkedTaskListId === list.id ? { ...t, textColor } : t));
  }

  protected saveCardColor(list: TaskList): void {
    const color = this.colorDrafts[list.id] ?? list.color;
    const textColor = this.colorDraftTextColors[list.id] ?? null;
    this.taskApi.updateListColor(list.id, color, textColor).subscribe({
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
    const cards = this.orderedCards();
    const layout = this.layoutMap();
    const colCount = this.columnCount();
    const items = cards.map((card, index) => {
      const id = card.data.id;
      const placement = layout.get(id);
      return {
        cardType: card.type,
        cardId: id,
        col: placement?.col ?? 1,
        colSpan: Math.min(placement?.colSpan ?? DEFAULT_COL_SPAN, colCount),
        order: placement?.order ?? index,
        minimized: placement?.minimized ?? false,
      };
    });
    this.lockerLayoutApi.saveLayout(items).subscribe({ error: () => {} });
  }

  // ── Pinnable layout helpers ──

  /** Return the layout for a card, or sensible defaults. */
  private getLayout(card: LockerCard): CardLayout {
    const id = card.data.id;
    return this.layoutMap().get(id) ?? { col: 1, colSpan: DEFAULT_COL_SPAN, order: 0, minimized: false };
  }

  /** Packs all cards once per signal change. Provides top positions and total height. */
  private readonly packedLayout = computed((): { tops: Map<string, number>; height: number } => {
    const colCount = this.columnCount();
    const heightMap = this.heightMap();
    const layoutMap = this.layoutMap();
    const items = this.orderedCards().map((card) => {
      const pl = layoutMap.get(card.data.id) ?? { col: 1, colSpan: DEFAULT_COL_SPAN, order: 0, minimized: false };
      return {
        id: card.data.id,
        col: pl.col,
        colSpan: pl.colSpan,
        order: pl.order,
        minimized: pl.minimized,
        height: heightMap.get(card.data.id) ?? 200,
      };
    });
    const packed = this.gridEngine.pack(items, colCount);
    const tops = new Map(packed.map((p) => [p.id, p.top]));
    const GAP = 16;
    const height =
      packed.length === 0
        ? 0
        : Math.max(...packed.map((p) => p.top + (p.minimized ? 40 : (heightMap.get(p.id) ?? 200)) + GAP));
    return { tops, height };
  });

  protected readonly gridHeight = computed(() => this.packedLayout().height);

  protected getCardTop(card: LockerCard): number {
    return this.packedLayout().tops.get(card.data.id) ?? 0;
  }

  protected getCardLeft(card: LockerCard): string {
    const id = card.data.id;
    const layout = this.layoutMap().get(id) ?? { col: 1, colSpan: DEFAULT_COL_SPAN, order: 0, minimized: false };
    const colCount = this.columnCount();
    const col = Math.min(layout.col, colCount);
    const pct = ((col - 1) / colCount) * 100;
    return `${pct}%`;
  }

  protected getCardWidth(card: LockerCard): string {
    const id = card.data.id;
    const layout = this.layoutMap().get(id) ?? { col: 1, colSpan: DEFAULT_COL_SPAN, order: 0, minimized: false };
    const colCount = this.columnCount();
    const colSpan = Math.min(layout.colSpan, colCount - (Math.min(layout.col, colCount) - 1));
    const pct = (colSpan / colCount) * 100;
    return `calc(${pct}% - 1rem)`;
  }

  protected getCardColor(card: LockerCard): string {
    if (card.type === 'TASK_LIST') return (card.data as TaskList).color || '#fffef8';
    if (card.type === 'TIMER') return (card.data as Timer).color || '#fffef8';
    if (card.type === 'NOTE') return (card.data as Note).color || '#fffef8';
    return '#fffef8';
  }

  protected getCardTitle(card: LockerCard): string {
    return (card.data as { title: string }).title ?? '';
  }

  protected isCardMinimized(card: LockerCard): boolean {
    return this.layoutMap().get(card.data.id)?.minimized ?? false;
  }

  protected toggleMinimize(card: LockerCard): void {
    const id = card.data.id;
    const current = this.layoutMap().get(id) ?? { col: 1, colSpan: DEFAULT_COL_SPAN, order: 0, minimized: false };
    const updated = new Map(this.layoutMap());
    updated.set(id, { ...current, minimized: !current.minimized });
    this.layoutMap.set(updated);
    this.saveLockerLayout();
  }

  // ── Drag-and-drop (free placement) ──

  protected onDragStart(event: MouseEvent, card: LockerCard): void {
    // Don't initiate drag if the click was on a button or input
    if ((event.target as HTMLElement).closest('button, input, a, textarea')) return;
    // Only drag from title bar
    if (!(event.target as HTMLElement).closest('.widget-title-bar')) return;

    this.dragCardId = card.data.id;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    const layout = this.getLayout(card);
    this.dragStartCol = layout.col;
    this.dragStartOrder = layout.order;
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
    const xInContainer = event.clientX - rect.left;
    const newCol = this.gridEngine.resolveDropColumn(xInContainer, rect.width, this.columnCount());

    if (newCol !== this.dragStartCol) {
      this.dragStartCol = newCol;
      const updated = new Map(this.layoutMap());
      const id = this.dragCardId;
      const current = updated.get(id) ?? { col: 1, colSpan: DEFAULT_COL_SPAN, order: 0, minimized: false };
      updated.set(id, { ...current, col: newCol });
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

  // ── Resize (right edge) ──

  protected onResizeStart(event: MouseEvent, card: LockerCard): void {
    event.stopPropagation();
    event.preventDefault();
    this.resizeCardId = card.data.id;
    this.resizeStartX = event.clientX;
    const layout = this.getLayout(card);
    this.resizeStartColSpan = layout.colSpan;
    if (this.gridContainerRef?.nativeElement) {
      this.resizeColumnWidth = this.gridContainerRef.nativeElement.getBoundingClientRect().width / this.columnCount();
    }
  }

  private handleResizeMove(event: MouseEvent): void {
    if (!this.resizeCardId) return;
    const dx = event.clientX - this.resizeStartX;
    const colDelta = Math.round(dx / (this.resizeColumnWidth || 100));
    const newSpan = Math.max(1, this.resizeStartColSpan + colDelta);
    const updated = new Map(this.layoutMap());
    const id = this.resizeCardId;
    const current = updated.get(id) ?? { col: 1, colSpan: DEFAULT_COL_SPAN, order: 0, minimized: false };
    const maxSpan = this.columnCount() - current.col + 1;
    const clampedSpan = Math.min(newSpan, maxSpan);
    if (clampedSpan !== current.colSpan) {
      updated.set(id, { ...current, colSpan: clampedSpan });
      this.layoutMap.set(updated);
    }
  }

  /** Assign layout for newly created cards. */
  private assignNewCardLayout(cardId: string, colSpan = DEFAULT_COL_SPAN): void {
    const colCount = this.columnCount();
    const items = this.orderedCards().map((c) => {
      const pl = this.layoutMap().get(c.data.id) ?? { col: 1, colSpan: DEFAULT_COL_SPAN, order: 0, minimized: false };
      return {
        id: c.data.id,
        col: pl.col,
        colSpan: pl.colSpan,
        order: pl.order,
        minimized: pl.minimized,
        height: this.heightMap().get(c.data.id) ?? 200,
      };
    });
    const existingHeights = new Array<number>(colCount).fill(0);
    const packed = this.gridEngine.pack(items, colCount);
    packed.forEach((p) => {
      const bottom = p.top + (this.heightMap().get(p.id) ?? 200) + 16;
      const pLayout = this.layoutMap().get(p.id) ?? { col: 1, colSpan: DEFAULT_COL_SPAN, order: 0, minimized: false };
      const start = pLayout.col - 1;
      const end = start + pLayout.colSpan;
      for (let c = start; c < end; c++) {
        existingHeights[c] = Math.max(existingHeights[c], bottom);
      }
    });
    const col = this.gridEngine.autoLayout(existingHeights, colSpan, colCount);
    const maxOrder = Math.max(0, ...Array.from(this.layoutMap().values()).map((l) => l.order)) + 1;
    const updated = new Map(this.layoutMap());
    updated.set(cardId, { col, colSpan, order: maxOrder, minimized: false });
    this.layoutMap.set(updated);
  }

  protected deleteList(list: TaskList): void {
    this.taskApi.deleteList(list.id).subscribe(() => {
      this.taskLists.update(current => current.filter(item => item.id !== list.id));
    });
  }

  protected addTask(list: TaskList): void {
    const draft = this.taskDrafts[list.id]?.trim();
    if (!draft) return;
    this.taskApi.addTask(list.id, draft).subscribe(task => {
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

  protected requestClean(list: TaskList): void {
    if (list.tasks.every(task => !task.completed)) return;
    this.confirmCleanList = list;
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
  protected asShortcut(card: LockerCard): Shortcut | null {
    return card.type === 'SHORTCUT' ? (card.data as Shortcut) : null;
  }
  protected asSticker(card: LockerCard): Sticker | null {
    return card.type === 'STICKER' ? (card.data as Sticker) : null;
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
        this.assignNewCardLayout(timer.id);
        this.saveLockerLayout();
        setTimeout(() => this.scrollToTimer(timer.id), 80);
      },
      error: () => { this.errorMessage = 'Unable to create a timer right now. Please try again.'; },
    });
  }

  private insertTimerAfterList(timerId: string, listId: string): void {
    const current = this.orderedCards()
      .map(c => ({ type: c.type as 'TASK_LIST' | 'TIMER' | 'NOTE' | 'SHORTCUT' | 'STICKER', id: c.data.id }))
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
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
  protected createTimer(): void {
    if (this.atTimerLimit()) return;
    const existingTitles = this.timers().map(t => t.title);
    const title = nextAutoName(existingTitles, 'Timer');
    const color = this.nextAvailableColor();
    this.timerApi.createTimer({ title, color }).subscribe({
      next: timer => {
        this.timers.update(current => [...current, timer]);
        this.errorMessage = '';
        this.assignNewCardLayout(timer.id);
        this.saveLockerLayout();
      },
      error: () => { this.errorMessage = 'Unable to create a timer right now. Please try again.'; },
    });
  }

  protected onTimerUpdated(updated: UpdateTimerResponse): void {
    const prev = this.timers().find(t => t.id === updated.id);
    this.timers.update(current => current.map(t => t.id === updated.id ? updated : t));
    if (updated.earnedBadge) {
      this.earnedBadges.update(current => [...current, updated.earnedBadge!]);
      this.badgeCelebration.notify(updated.earnedBadge);
    }
    if (updated.linkedTaskListId && prev?.linkedTaskListId !== updated.linkedTaskListId) {
      this.insertTimerAfterList(updated.id, updated.linkedTaskListId);
      this.saveLockerLayout();
    }
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
  protected toggleNoteMenu(): void {
    if (this.atNoteLimit()) return;
    this.noteMenuOpen = !this.noteMenuOpen;
  }

  protected createNote(noteType: NoteType = 'REGULAR'): void {
    this.noteMenuOpen = false;
    if (this.atNoteLimit()) return;
    if (noteType === 'QUOTE' && this.hasQuoteNote()) return;
    const existingTitles = this.notes().map(n => n.title);
    const baseName = noteType === 'QUOTE' ? 'Quote of the Day' : 'Note';
    const title = nextAutoName(existingTitles, baseName);
    const color = this.nextAvailableColor();
    this.noteApi.createNote({ title, color, noteType }).subscribe({
      next: note => {
        this.notes.update(current => [...current, note]);
        this.errorMessage = '';
        this.assignNewCardLayout(note.id);
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
  }

  protected onShortcutUrlBlur(): void {
    const url = this.shortcutUrlDraft.trim();
    if (!url) return;
    this.shortcutApi.getMetadata(url).subscribe({
      next: meta => {
        if (!this.shortcutNameDraft.trim()) {
          this.shortcutNameDraft = meta.title;
        }
        if (meta.faviconUrl) {
          this.shortcutFaviconPreview = meta.faviconUrl;
        }
      },
      error: () => {},
    });
  }

  protected saveShortcut(): void {
    const url = this.shortcutUrlDraft.trim();
    if (!url) return;
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
          this.saveLockerLayout();
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
    this.shortcutIconType = shortcut.emoji ? 'emoji' : 'favicon';
    this.shortcutEmojiDraft = shortcut.emoji ?? '';
    this.shortcutDialogOpen = true;
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
        this.cardOrder.update(order => order.filter(o => !(o.type === 'SHORTCUT' && o.id === shortcut.id)));
        this.saveLockerLayout();
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

  // --- Study Session ---
  protected enterStudySession(timerId: string): void {
    const timer = this.timers().find(t => t.id === timerId);
    if (!timer?.linkedTaskListId) return;
    this.closeConfig();
    this.studySession.set({ timerId, listId: timer.linkedTaskListId });
  }

  protected exitStudySession(): void {
    this.studySession.set(null);
  }

  protected enterStudySessionFromBar(): void {
    const timer = this.studyReadyTimers()[0];
    if (timer) this.enterStudySession(timer.id);
  }

  protected handleLogout(): void {
    this.sessionStore.clearSession();
    this.router.navigate(['/']);
  }

  // --- Sticker CRUD ---
  protected openStickerDialog(): void {
    if (this.atStickerLimit()) return;
    this.stickerEditId = null;
    this.stickerDialogTab = 'emoji';
    this.stickerDialogEmoji = '';
    this.stickerDialogIconUrl = '';
    this.stickerDialogLabel = '';
    this.stickerDialogOpen = true;
    this.fontPickerOpen = false;
    this.colorPickerListId = null;
  }

  protected openEditStickerDialog(sticker: Sticker): void {
    this.stickerEditId = sticker.id;
    this.stickerDialogTab = sticker.emoji ? 'emoji' : 'url';
    this.stickerDialogEmoji = sticker.emoji ?? '';
    this.stickerDialogIconUrl = sticker.iconUrl ?? '';
    this.stickerDialogLabel = sticker.label ?? '';
    this.stickerDialogOpen = true;
    this.fontPickerOpen = false;
    this.colorPickerListId = null;
  }

  protected closeStickerDialog(): void {
    this.stickerDialogOpen = false;
    this.stickerEditId = null;
  }

  protected onStickerDialogEmojiSelected(emoji: string): void {
    this.stickerDialogEmoji = emoji;
  }

  protected canSubmitStickerDialog(): boolean {
    if (this.stickerDialogTab === 'emoji') return !!this.stickerDialogEmoji;
    return !!this.stickerDialogIconUrl.trim();
  }

  protected submitStickerDialog(): void {
    if (!this.canSubmitStickerDialog()) return;
    const emoji = this.stickerDialogTab === 'emoji' ? this.stickerDialogEmoji : null;
    const iconUrl = this.stickerDialogTab === 'url' ? this.stickerDialogIconUrl.trim() : null;
    const label = this.stickerDialogLabel.trim() || null;

    if (this.stickerEditId) {
      this.stickerApi.updateSticker(this.stickerEditId, { emoji, iconUrl, label }).subscribe({
        next: updated => {
          this.stickers.update(current => current.map(s => s.id === updated.id ? updated : s));
          this.closeStickerDialog();
        },
        error: () => { this.errorMessage = 'Unable to update sticker. Please try again.'; },
      });
    } else {
      this.stickerApi.createSticker({ emoji, iconUrl, label }).subscribe({
        next: sticker => {
          this.stickers.update(current => [...current, sticker]);
          if (sticker.earnedBadge) {
            this.earnedBadges.update(current => [...current, sticker.earnedBadge!]);
            this.badgeCelebration.notify(sticker.earnedBadge);
          }
          this.errorMessage = '';
          this.saveLockerLayout();
          this.closeStickerDialog();
        },
        error: () => { this.errorMessage = 'Unable to add sticker. Please try again.'; },
      });
    }
  }

  protected onStickerDeleted(id: string): void {
    this.stickers.update(current => current.filter(s => s.id !== id));
    this.cardOrder.update(order => order.filter(o => !(o.type === 'STICKER' && o.id === id)));
    this.stickerApi.deleteSticker(id).subscribe();
    this.saveLockerLayout();
  }

  private nextAvailableColor(): string {
    const used = new Set([
      ...this.taskLists().map(l => l.color),
      ...this.timers().map(t => t.color),
      ...this.notes().map(n => n.color),
    ]);
    return this.colorPalette.find((color: string) => !used.has(color)) ?? this.colorPalette[0];
  }
}
