import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnInit, QueryList, ViewChildren, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { forkJoin } from 'rxjs';
import { TaskApiService } from '../../../core/services/task-api.service';
import { TimerApiService } from '../../../core/services/timer-api.service';
import { NoteApiService } from '../../../core/services/note-api.service';
import { BookmarkApiService } from '../../../core/services/bookmark-api.service';
import { LockerLayoutApiService } from '../../../core/services/locker-layout-api.service';
import { SessionStore } from '../../../core/session/session.store';
import { TaskItem, TaskList, Timer, Note, BookmarkList, Sticker, NoteType } from '../../../core/models/task.models';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { InlineTitleEditComponent } from '../../../shared/inline-title-edit/inline-title-edit.component';
import { ColorPickerComponent } from '../../../shared/color-picker/color-picker.component';
import { DueDatePopoverComponent } from '../../../shared/due-date-popover/due-date-popover.component';
import { TimerCardComponent } from '../../../shared/timer-card/timer-card.component';
import { NoteCardComponent } from '../../../shared/note-card/note-card.component';
import { BookmarkCardComponent } from '../../../shared/bookmark-card/bookmark-card.component';
import { StickerComponent } from '../../../shared/sticker/sticker.component';
import { EmojiPickerComponent } from '../../../shared/sticker/emoji-picker.component';
import { StickerApiService } from '../../../core/services/sticker-api.service';
import { DEFAULT_PALETTE, autoContrastColor, isGradient, firstHexFromGradient } from '../../../shared/color-picker/color-utils';

type LockerCard =
  | { type: 'TASK_LIST'; data: TaskList }
  | { type: 'TIMER'; data: Timer }
  | { type: 'NOTE'; data: Note }
  | { type: 'BOOKMARK_LIST'; data: BookmarkList };

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
    TimerCardComponent, NoteCardComponent, BookmarkCardComponent, StickerComponent, EmojiPickerComponent],
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
        '--lc-shelf-text': lockerColor().shelfText
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
            📋
          </button>
          <button type="button" class="app-icon-btn"
                  [disabled]="atTimerLimit()"
                  [title]="atTimerLimit() ? 'Maximum of 10 timers reached' : 'Create a Pomodoro timer'"
                  (click)="createTimer()" aria-label="Create new timer">
            ⏱
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
                  [disabled]="atBookmarkListLimit()"
                  [title]="atBookmarkListLimit() ? 'Maximum of 10 bookmark lists reached' : 'Create a bookmark list'"
                  (click)="createBookmarkList()" aria-label="Create new bookmark list">
            🔗
          </button>
          <button type="button" class="app-icon-btn"
                  *ngIf="studyReadyTimers().length > 0"
                  title="Enter Study Session"
                  (click)="enterStudySessionFromBar()" aria-label="Enter Study Session">
            📚
          </button>
          <button type="button" class="app-icon-btn"
                  [disabled]="atStickerLimit()"
                  [title]="atStickerLimit() ? 'Maximum of 30 stickers reached' : 'Add a sticker'"
                  (click)="toggleStickerPicker(); $event.stopPropagation()" aria-label="Add sticker">
            🌈
          </button>
          <button type="button" class="app-icon-btn app-icon-btn--font"
                  [title]="'Locker font: ' + lockerFont().name"
                  (click)="toggleFontPicker(); $event.stopPropagation()" aria-label="Change locker font">
            Aa
          </button>
        </div>
        <div class="font-picker-panel" *ngIf="fontPickerOpen" (click)="$event.stopPropagation()">
          <button *ngFor="let f of LOCKER_FONTS" type="button" class="font-option"
                  [class.font-option--active]="lockerFont().id === f.id"
                  [style.fontFamily]="f.family"
                  (click)="setLockerFont(f)">{{ f.name }}</button>
        </div>
        <app-emoji-picker
          *ngIf="stickerPickerOpen"
          class="sticker-picker-panel"
          (emojiSelected)="onEmojiSelected($event)"
          (click)="$event.stopPropagation()"
        ></app-emoji-picker>
        <p *ngIf="errorMessage" class="error">{{ errorMessage }}</p>
      </header>

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
      <div class="lists" *ngIf="!studySession() && orderedCards().length"
           cdkDropList cdkDropListOrientation="mixed" (cdkDropListDropped)="reorderCards($event)">
        <ng-container *ngFor="let card of orderedCards(); trackBy: trackByCardId">

        <!-- Timer card -->
        <app-timer-card
          *ngIf="card.type === 'TIMER'"
          cdkDrag
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
          cdkDrag
          [note]="asNote(card)!"
          (noteUpdated)="onNoteUpdated($event)"
          (noteDeleted)="onNoteDeleted($event)"
        ></app-note-card>

        <!-- Bookmark list card -->
        <app-bookmark-card
          *ngIf="card.type === 'BOOKMARK_LIST'"
          cdkDrag
          [list]="asBookmarkList(card)!"
          (listUpdated)="onBookmarkListUpdated($event)"
          (listDeleted)="onBookmarkListDeleted($event)"
        ></app-bookmark-card>

        <!-- Task list card -->
        <ng-container *ngIf="asTaskList(card) as list">
        <article
          class="list-card"
          [style.background]="list.color || '#fffef8'"
          [style.color]="cardTextColor(list)"
          [class.list-card--elevated]="dueDatePopoverListId === list.id || colorPickerListId === list.id"
          cdkDrag
          (click)="$event.stopPropagation()"
        >
          <div class="list-card__drag-handle" cdkDragHandle aria-label="Drag to reorder">⠿</div>
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

        </ng-container>
      </div>

      <!-- Sticker overlay layer -->
      <div class="sticker-layer" *ngIf="stickers().length > 0">
        <app-sticker
          *ngFor="let sticker of stickers(); trackBy: trackByStickerId"
          [sticker]="sticker"
          (positionChanged)="onStickerPositionChanged(sticker.id, $event.x, $event.y)"
          (sizeChanged)="onStickerSizeChanged(sticker.id, $event)"
          (deleted)="onStickerDeleted(sticker.id)"
        ></app-sticker>
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
  styles: [
    `
      /* ══════════════════════════════════════════════════════════
         LOCKER DOOR ANIMATION
         ══════════════════════════════════════════════════════════ */

      .locker-overlay {
        position: fixed;
        inset: 0;
        z-index: 200;
        display: flex;
        align-items: stretch;
        overflow: hidden;
      }

      /* One bay per locker — 5 equal columns */
      .locker-bay {
        flex: 1;
        position: relative;
        border-right: 3px solid rgba(0,0,0,0.32);
        box-shadow: inset -1px 0 0 rgba(255,255,255,0.08);
      }
      .locker-bay:last-child { border-right: none; }

      /* Center bay provides the perspective for the swinging door */
      .locker-bay--center {
        perspective: 600px;
        perspective-origin: 0% 50%;
      }

      /* ── Locker interior (center bay only, revealed as door opens) ── */
      .locker-interior {
        position: absolute;
        inset: 0;
        background:
          radial-gradient(ellipse 90% 18% at 50% 0%, rgba(255,255,255,0.09) 0%, transparent 100%),
          linear-gradient(180deg, #2c3540 0%, #1e2830 55%, #141c22 100%);
        overflow: hidden;
      }
      .locker-shelf {
        position: absolute;
        left: 0; right: 0;
        height: 8px;
        background: linear-gradient(180deg, #6a7480 0%, #3a444c 100%);
        box-shadow: 0 4px 12px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.16);
      }
      .locker-shelf::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 0; right: 0;
        height: 18px;
        background: linear-gradient(to bottom, rgba(0,0,0,0.35), transparent);
      }
      .locker-shelf--top  { top: 30%; }
      .locker-shelf--bottom { bottom: 22%; }

      .locker-item {
        position: absolute;
        line-height: 1;
        filter: drop-shadow(0 4px 10px rgba(0,0,0,0.65));
        user-select: none;
      }
      /* Books row sitting on the bottom shelf */
      .locker-books {
        position: absolute;
        bottom: 22%;
        left: 50%;
        transform: translate(-50%, -100%);
        font-size: clamp(1.8rem, 3.5vw, 3rem);
        line-height: 1;
        white-space: nowrap;
        letter-spacing: 0.08em;
        filter: drop-shadow(0 3px 6px rgba(0,0,0,0.55));
        user-select: none;
      }

      /* All doors fill their bay */
      .locker-door {
        position: absolute;
        inset: 0;
        background-image: repeating-linear-gradient(
          90deg,
          transparent 0px, transparent 49px,
          rgba(255,255,255,0.05) 49px, rgba(255,255,255,0.05) 50px
        );
        box-shadow: inset -6px 0 20px rgba(0,0,0,0.35), inset 4px 0 10px rgba(255,255,255,0.07);
      }

      /* Inset panel bevel on all doors */
      .locker-door::before {
        content: '';
        position: absolute;
        inset: 14px;
        border-top: 2px solid rgba(255,255,255,0.25);
        border-left: 2px solid rgba(255,255,255,0.25);
        border-right: 2px solid rgba(0,0,0,0.2);
        border-bottom: 2px solid rgba(0,0,0,0.2);
        border-radius: 3px;
        pointer-events: none;
        z-index: 0;
      }

      /* The animated (center) door */
      .locker-door--animated {
        transform-origin: left center;
        transform-style: preserve-3d;
        will-change: transform;
      }

      /* Right-edge depth strip — only needed on the swinging door */
      .locker-door__edge {
        position: absolute;
        right: -18px;
        top: 0;
        width: 18px;
        height: 100%;
        background: linear-gradient(to right, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.2) 70%, transparent 100%);
        pointer-events: none;
      }

      /* Door swing animation */
      .locker-overlay--opening .locker-door--animated {
        animation: doorSwing 0.9s cubic-bezier(0.55, 0, 0.15, 1) forwards;
      }
      @keyframes doorSwing {
        0%   { transform: rotateY(0deg); }
        78%  { transform: rotateY(-110deg); }
        90%  { transform: rotateY(-103deg); }
        100% { transform: rotateY(-107deg); }
      }

      /* ── Logo sticker ── */
      .locker-logo {
        position: absolute;
        top: 36%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-4deg);
        width: clamp(80px, 58%, 155px);
        height: auto;
        z-index: 2;
        background: #fff;
        border-radius: 6px;
        padding: 6px 8px 4px;
        box-shadow:
          0 3px 10px rgba(0,0,0,0.35),
          0 1px 3px rgba(0,0,0,0.2),
          inset 0 0 0 1px rgba(0,0,0,0.04);
        pointer-events: none;
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
      }

      /* ── Vent groups (upper center) ── */
      .locker-vents {
        position: absolute;
        top: clamp(3rem, 12%, 5rem);
        left: 10%;
        right: 10%;
        display: flex;
        flex-direction: column;
        gap: clamp(0.5rem, 3%, 0.9rem);
        z-index: 1;
      }
      .locker-vent-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .locker-vent {
        height: 7px;
        border-radius: 2px;
        background: rgba(0,0,0,0.55);
        box-shadow:
          inset 0 2px 4px rgba(0,0,0,0.7),
          0 1px 0 rgba(255,255,255,0.1);
      }

      /* ── Combination dial lock — right side, vertically centered ── */
      .locker-lock {
        position: absolute;
        right: 18%;
        top: 55%;
        transform: translateY(-50%);
        z-index: 1;
      }
      /* Mounting plate */
      .locker-lock__plate {
        width: 56px;
        height: 72px;
        background: linear-gradient(160deg, #d4d4d8 0%, #a1a1aa 50%, #c4c4c8 100%);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow:
          0 6px 16px rgba(0,0,0,0.5),
          inset 0 1px 0 rgba(255,255,255,0.5),
          inset 0 -1px 0 rgba(0,0,0,0.2);
      }
      /* Dial */
      .locker-lock__dial {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: radial-gradient(circle at 38% 36%, #52525b 0%, #27272a 55%, #18181b 100%);
        border: 3px solid #e4e4e7;
        box-shadow:
          inset 0 2px 8px rgba(0,0,0,0.75),
          0 3px 8px rgba(0,0,0,0.45);
        position: relative;
        /* Tick marks via conic gradient */
        background-image:
          conic-gradient(
            from 0deg,
            transparent 0deg 9deg, rgba(255,255,255,0.18) 9deg 11deg,
            transparent 11deg 21deg, rgba(255,255,255,0.09) 21deg 23deg,
            transparent 23deg 33deg, rgba(255,255,255,0.18) 33deg 35deg,
            transparent 35deg 45deg, rgba(255,255,255,0.09) 45deg 47deg,
            transparent 47deg 57deg, rgba(255,255,255,0.18) 57deg 59deg,
            transparent 59deg 69deg, rgba(255,255,255,0.09) 69deg 71deg,
            transparent 71deg 81deg, rgba(255,255,255,0.18) 81deg 83deg,
            transparent 83deg 93deg, rgba(255,255,255,0.09) 93deg 95deg,
            transparent 95deg 105deg, rgba(255,255,255,0.18) 105deg 107deg,
            transparent 107deg 117deg, rgba(255,255,255,0.09) 117deg 119deg,
            transparent 119deg 129deg, rgba(255,255,255,0.18) 129deg 131deg,
            transparent 131deg 141deg, rgba(255,255,255,0.09) 141deg 143deg,
            transparent 143deg 153deg, rgba(255,255,255,0.18) 153deg 155deg,
            transparent 155deg 165deg, rgba(255,255,255,0.09) 165deg 167deg,
            transparent 167deg 177deg, rgba(255,255,255,0.18) 177deg 179deg,
            transparent 179deg 189deg, rgba(255,255,255,0.09) 189deg 191deg,
            transparent 191deg 201deg, rgba(255,255,255,0.18) 201deg 203deg,
            transparent 203deg 213deg, rgba(255,255,255,0.09) 213deg 215deg,
            transparent 215deg 225deg, rgba(255,255,255,0.18) 225deg 227deg,
            transparent 227deg 237deg, rgba(255,255,255,0.09) 237deg 239deg,
            transparent 239deg 249deg, rgba(255,255,255,0.18) 249deg 251deg,
            transparent 251deg 261deg, rgba(255,255,255,0.09) 261deg 263deg,
            transparent 263deg 273deg, rgba(255,255,255,0.18) 273deg 275deg,
            transparent 275deg 285deg, rgba(255,255,255,0.09) 285deg 287deg,
            transparent 287deg 297deg, rgba(255,255,255,0.18) 297deg 299deg,
            transparent 299deg 309deg, rgba(255,255,255,0.09) 309deg 311deg,
            transparent 311deg 321deg, rgba(255,255,255,0.18) 321deg 323deg,
            transparent 323deg 333deg, rgba(255,255,255,0.09) 333deg 335deg,
            transparent 335deg 345deg, rgba(255,255,255,0.18) 345deg 347deg,
            transparent 347deg 360deg
          ),
          radial-gradient(circle at 38% 36%, #52525b 0%, #27272a 55%, #18181b 100%);
      }
      /* Arrow indicator — fixed pointer at top of plate, not on dial */
      .locker-lock__indicator {
        position: absolute;
        top: -14px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-top: 8px solid #a1a1aa;
        filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4));
      }
      /* Dial spin */
      .locker-lock__dial--spinning {
        animation: dialSpin 1.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      }
      @keyframes dialSpin {
        0%   { transform: rotate(0deg); }
        30%  { transform: rotate(-720deg); }
        62%  { transform: rotate(-360deg); }
        82%  { transform: rotate(-540deg); }
        100% { transform: rotate(-540deg); }
      }

      /* ══════════════════════════════════════════════════════════
         DASHBOARD (locker interior)
         Uses CSS custom properties set via [ngStyle]:
           --lc-interior  background paint color
           --lc-shelf     header/shelf color
           --lc-accent    door color used for buttons/highlights
         ══════════════════════════════════════════════════════════ */

      .dashboard {
        min-height: 100dvh;
        font-family: var(--locker-font, inherit);
        background-color: var(--lc-accent, #3d8ed4);
        background-image: repeating-linear-gradient(
          0deg, transparent 0, transparent 3px,
          rgba(0,0,0,0.03) 3px, rgba(0,0,0,0.03) 4px
        );
        color: #1c1c1e;
        padding: clamp(1.5rem, 3vw, 2.5rem) clamp(1rem, 3vw, 2.5rem);
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      /* ── Header / shelf — frosted white over the vibrant background ── */
      .dashboard__header {
        position: relative;
        /* No z-index — does not create a stacking context, so the sticker-layer
           (z-index:1) paints over the ::before background but under the content
           divs (z-index:2) that are children of this element. */
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        padding: 1.25rem 1.5rem;
      }

      /* Frosted background lives on a pseudo-element so the sticker layer can
         paint between it and the interactive content above. */
      .dashboard__header::before {
        content: '';
        position: absolute;
        inset: 0;
        background: rgba(255,255,255,0.82);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,0.6);
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        pointer-events: none;
        z-index: 0;
      }

      /* Interactive header content must sit above the sticker layer (z-index:1).
         pointer-events:none on the wrapper so transparent areas don't block stickers;
         restored on all children so buttons/links/inputs remain clickable. */
      .top-row,
      .locker-app-bar {
        position: relative;
        z-index: 2;
        pointer-events: none;
      }
      .top-row > *,
      .locker-app-bar > * {
        pointer-events: auto;
      }
      .top-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        width: 100%;
        flex-wrap: wrap;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
      .brand__link {
        display: inline-flex;
        align-items: center;
        gap: 0.75rem;
        color: #1c1c1e;
        text-decoration: none;
      }
      .brand img {
        height: 40px;
        width: auto;
        display: block;
      }
      .brand__text h1 {
        margin: 0;
        font-size: 1.4rem;
        color: #1c1c1e;
        letter-spacing: 0.5px;
      }
      .header-right {
        display: flex;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
      }
      .nav-links {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
      .nav-link {
        color: #3f3f46;
        text-decoration: none;
        font-weight: 700;
        font-size: 0.875rem;
        border-radius: 8px;
        padding: 0.5rem 1rem;
        background: rgba(0,0,0,0.06);
        border: 1px solid rgba(0,0,0,0.1);
        transition: background 0.12s;
        display: inline-block;
      }
      .nav-link:hover { background: rgba(0,0,0,0.12); color: #1c1c1e; }
      button.nav-link { cursor: pointer; font-family: inherit; }
      .nav-link--admin { color: #7048c0; border-color: rgba(112,72,192,0.25); background: rgba(112,72,192,0.08); }
      .nav-link--admin:hover { background: rgba(112,72,192,0.16); color: #5030a0; }
      .nav-link--logout { color: #b91c1c; border-color: rgba(185,28,28,0.2); background: rgba(185,28,28,0.06); }
      .nav-link--logout:hover { background: rgba(185,28,28,0.14); color: #991b1b; }

      /* ── Locker color picker ── */
      .locker-color-picker {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .locker-color-picker__label {
        font-size: 0.78rem;
        font-weight: 700;
        color: #52525b;
        white-space: nowrap;
      }
      .locker-color-swatches {
        display: flex;
        gap: 5px;
      }
      .locker-swatch {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 2px solid transparent;
        padding: 0;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        transition: transform 0.12s, box-shadow 0.12s;
      }
      .locker-swatch:hover {
        transform: scale(1.2);
        box-shadow: 0 3px 8px rgba(0,0,0,0.3);
      }
      .locker-swatch--active {
        border-color: #1c1c1e;
        transform: scale(1.15);
        box-shadow: 0 0 0 1px rgba(255,255,255,0.6), 0 3px 8px rgba(0,0,0,0.3);
      }

      .error {
        color: #b00020;
        margin: 0;
        font-weight: 600;
        font-size: 0.9rem;
        width: 100%;
      }

      /* ── New list form ── */
      .new-list {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        flex-wrap: wrap;
        width: 100%;
      }
      .new-list input {
        border: 1px solid rgba(0,0,0,0.15);
        border-radius: 8px;
        padding: 0.6rem 0.85rem;
        min-width: 200px;
        background: rgba(255,255,255,0.7);
        color: #1c1c1e;
        font: inherit;
        font-size: 0.95rem;
      }
      .new-list input::placeholder { color: rgba(0,0,0,0.35); }
      .new-list input:focus {
        outline: none;
        border-color: var(--lc-accent, #3d8ed4);
        background: #fff;
      }
      .new-list button {
        background: var(--lc-accent, #3d8ed4);
        border: none;
        border-radius: 8px;
        padding: 0.6rem 1.1rem;
        color: #fff;
        font-weight: 800;
        font-size: 0.9rem;
        font-family: inherit;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        transition: opacity 0.12s;
      }
      .new-list button:hover { opacity: 0.88; }
      .new-list button:disabled { opacity: 0.4; cursor: not-allowed; }

      /* ── List grid ── */
      .lists {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1rem;
        align-items: start;
        position: relative;
        z-index: 2;
        /* Pass pointer events through empty grid gaps so stickers beneath remain
           interactive; CDK drag items (direct children) restore pointer-events. */
        pointer-events: none;
      }
      .lists > * {
        pointer-events: auto;
      }

      /* ── List card ── */
      .list-card {
        border-radius: 12px;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        position: relative;
        z-index: 2;
        box-shadow: 0 8px 24px rgba(0,0,0,0.22), 0 2px 6px rgba(0,0,0,0.12);
        border: 1px solid rgba(255,255,255,0.5);
      }
      .list-card--elevated { z-index: 20; }
      .list-card__header {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        position: relative;
      }
      .list-card__header h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 800;
        color: #2d1a10;
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* ── Buttons (inside list cards) ── */
      button {
        border: 1px solid rgba(45,26,16,0.2);
        border-radius: 6px;
        padding: 0.4rem 0.75rem;
        background: rgba(255,255,255,0.8);
        color: #2d1a10;
        font-weight: 700;
        font-size: 0.8rem;
        font-family: inherit;
        cursor: pointer;
        transition: opacity 0.12s;
      }
      button:hover { opacity: 0.8; }
      button:disabled { opacity: 0.4; cursor: not-allowed; }
      .ghost {
        background: rgba(255,255,255,0.5);
        border: 1px dashed rgba(45,26,16,0.2);
        padding: 0.3rem 0.6rem;
      }
      .ghost.clean { background: rgba(130,201,255,0.2); }
      .clean__label { text-decoration: line-through; }
      .danger { color: #b00020; border-color: rgba(176,0,32,0.25); }
      .icon-button {
        width: 1.8rem;
        height: 1.8rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        font-size: 1rem;
        line-height: 1;
        padding: 0;
        background: rgba(255,255,255,0.7);
        border: 1px solid rgba(45,26,16,0.2);
        color: #2d1a10;
      }
      .icon-button.gear { background: rgba(255,255,255,0.9); }
      @keyframes timer-flash {
        0%   { box-shadow: 0 0 0 3px rgba(255,165,0,0.8); }
        60%  { box-shadow: 0 0 0 6px rgba(255,165,0,0.3); }
        100% { box-shadow: 0 0 0 0 rgba(255,165,0,0); }
      }
      .timer-flash { animation: timer-flash 0.9s ease-out forwards; }
      .list-actions {
        display: flex;
        gap: 0.3rem;
        align-items: center;
        justify-content: flex-end;
      }
      .confirm-bar {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        background: rgba(176,0,32,0.08);
        border: 1px solid rgba(176,0,32,0.2);
        border-radius: 6px;
        padding: 0.3rem 0.5rem;
        color: #8c1f24;
        font-size: 0.8rem;
        font-weight: 700;
      }
      .config-panel {
        padding: 0.6rem;
        border-radius: 8px;
        border: 1px solid rgba(45,26,16,0.15);
        background: #fffef8;
        display: inline-flex;
        flex-direction: column;
        gap: 0.5rem;
        position: absolute;
        top: 2.2rem;
        right: 0;
        z-index: 5;
        box-shadow: 0 12px 32px rgba(0,0,0,0.2);
        min-width: 220px;
      }
      .config-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 700;
        font-size: 0.85rem;
        color: #2d1a10;
      }
      .swatches {
        display: grid;
        grid-template-columns: repeat(4, 28px);
        gap: 0.3rem;
      }
      .swatch {
        width: 28px;
        height: 28px;
        border-radius: 6px;
        border: 2px solid transparent;
        cursor: pointer;
        padding: 0;
        box-shadow: 0 2px 4px rgba(0,0,0,0.15);
      }
      .swatch--active { border-color: #2d1a10; }

      /* ── Tasks ── */
      .task-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
      }
      .task-list li {
        display: flex;
        align-items: stretch;
        gap: 0.4rem;
        background: rgba(255,255,255,0.6);
        border-radius: 6px;
        padding: 0.2rem 0.4rem;
      }
      .drag-handle {
        display: inline-flex;
        align-items: center;
        padding: 0.3rem 0.2rem;
        cursor: grab;
        color: rgba(45,26,16,0.4);
        font-size: 0.85rem;
        user-select: none;
      }
      .drag-handle:active { cursor: grabbing; }
      .task-list li.cdk-drag-preview { box-shadow: 0 8px 20px rgba(0,0,0,0.2); }
      .task-list li.cdk-drag-placeholder { opacity: 0.2; }
      .task-row {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        flex: 1;
        justify-content: space-between;
      }
      .task-row.editing { align-items: stretch; }
      .task-text {
        flex: 1;
        background: transparent;
        border: none;
        text-align: left;
        padding: 0.3rem 0.4rem;
        font: inherit;
        font-size: 0.875rem;
        color: #2d1a10;
        cursor: text;
      }
      .task-text.completed { color: #8a8a8a; text-decoration: line-through; }
      .new-task {
        display: flex;
        gap: 0.4rem;
        align-items: center;
      }
      .new-task input {
        flex: 1;
        border: 1px solid rgba(45,26,16,0.18);
        border-radius: 6px;
        padding: 0.45rem 0.65rem;
        background: rgba(255,255,255,0.75);
        color: #2d1a10;
        font: inherit;
        font-size: 0.875rem;
      }
      .new-task input::placeholder { color: rgba(45,26,16,0.35); }
      .new-task input:focus { outline: none; border-color: var(--lc-accent, #4a7eb5); }
      .title-edit-input,
      .edit-input {
        flex: 1;
        border: 1px solid rgba(45,26,16,0.2);
        border-radius: 6px;
        padding: 0.35rem 0.55rem;
        background: #fffdf7;
        color: #2d1a10;
        font: inherit;
        font-size: 0.875rem;
        min-width: 120px;
      }

      /* ── Empty state ── */
      .empty-card {
        background: #fff;
        border: 1px solid rgba(0,0,0,0.08);
        border-radius: 14px;
        padding: clamp(1.5rem, 3vw, 2rem);
        box-shadow: 0 4px 16px rgba(0,0,0,0.08);
        max-width: 560px;
        margin: 2rem auto 0;
        display: grid;
        gap: 0.75rem;
        text-align: center;
      }
      .empty-card__icon { font-size: 2.5rem; }
      .empty-card h2 { margin: 0; font-size: 1.4rem; color: #1c1c1e; }
      .empty-card__lead { margin: 0; font-size: 1rem; line-height: 1.6; color: #3f3f46; }
      .empty-card__steps {
        margin: 0;
        padding-left: 1.2rem;
        display: grid;
        gap: 0.35rem;
        font-weight: 600;
        font-size: 0.9rem;
        color: #52525b;
        text-align: left;
      }
      .empty-card__steps li { line-height: 1.5; }

      .sr-only {
        position: absolute;
        width: 1px; height: 1px;
        padding: 0; margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        border: 0;
      }

      /* ── App bar (create + font) ── */
      .locker-app-bar {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        width: 100%;
        margin-top: 0.25rem;
      }

      .app-icon-btn {
        width: 3rem;
        height: 3rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        font-size: 1.5rem;
        line-height: 1;
        padding: 0;
        background: rgba(255,255,255,0.85);
        border: 2px solid rgba(0,0,0,0.12);
        cursor: pointer;
        transition: transform 0.12s, opacity 0.12s;
        box-shadow: 0 2px 6px rgba(0,0,0,0.12);
      }
      .app-icon-btn:hover:not(:disabled) { transform: scale(1.1); }
      .app-icon-btn:disabled { opacity: 0.35; cursor: not-allowed; }
      .app-icon-btn--font { font-family: var(--font-display, inherit); font-size: 1.1rem; font-weight: 800; }

      /* ── Font picker panel ── */
      .font-picker-panel {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
        padding: 0.75rem;
        background: rgba(255,255,255,0.95);
        backdrop-filter: blur(12px);
        border-radius: 10px;
        border: 1px solid rgba(0,0,0,0.1);
        box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        width: 100%;
        margin-top: 0.25rem;
      }

      .font-option {
        padding: 0.4rem 0.8rem;
        border-radius: 6px;
        border: 1px solid rgba(0,0,0,0.12);
        background: rgba(255,255,255,0.7);
        cursor: pointer;
        font-size: 0.9rem;
        transition: background 0.12s;
      }
      .font-option:hover { background: rgba(0,0,0,0.06); }
      .font-option--active {
        background: var(--lc-accent, #3d8ed4);
        color: #fff;
        border-color: transparent;
      }

      .sticker-picker-panel {
        position: absolute;
        top: 100%;
        right: 0;
        z-index: 100;
        margin-top: 0.25rem;
      }

      /* ── Note submenu ── */
      .note-submenu {
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        z-index: 100;
        margin-top: 0.25rem;
        background: rgba(255,255,255,0.97);
        backdrop-filter: blur(12px);
        border-radius: 10px;
        border: 1px solid rgba(0,0,0,0.1);
        box-shadow: 0 8px 24px rgba(0,0,0,0.18);
        min-width: 11rem;
        overflow: hidden;
      }
      .note-submenu__item {
        display: block;
        width: 100%;
        text-align: left;
        padding: 0.55rem 0.9rem;
        background: none;
        border: none;
        font: inherit;
        font-size: 0.88rem;
        cursor: pointer;
        color: #1c1c1e;
        transition: background 0.1s;
      }
      .note-submenu__item:hover:not(:disabled) { background: rgba(0,0,0,0.06); }
      .note-submenu__item:disabled { opacity: 0.4; cursor: not-allowed; }

      .sticker-layer {
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 1;

        app-sticker { pointer-events: all; }
      }

      /* When a sticker is hovered or showing its confirm prompt, raise the whole
         layer above the tool-card grid (z-index:2) so controls are never obscured. */
      .sticker-layer:has(.sticker:hover),
      .sticker-layer:has(.sticker--confirming) {
        z-index: 3;
      }

      /* ── Floating color picker panel ── */
      .color-picker-panel.floating {
        position: absolute;
        top: 2.4rem;
        right: 0;
        z-index: 20;
        background: #fffef8;
        border-radius: 10px;
        border: 1px solid rgba(45,26,16,0.12);
        box-shadow: 0 12px 32px rgba(0,0,0,0.2);
        padding: 0.5rem;
        min-width: 300px;
      }

      /* ── Card drag handle ── */
      .list-card__drag-handle {
        position: absolute;
        top: 0.5rem;
        left: 0.5rem;
        cursor: grab;
        color: rgba(45,26,16,0.3);
        font-size: 1rem;
        line-height: 1;
        user-select: none;
        padding: 0.15rem;
      }
      .list-card__drag-handle:active { cursor: grabbing; }
      .list-card.cdk-drag-preview {
        box-shadow: 0 16px 40px rgba(0,0,0,0.3);
        border-radius: 12px;
      }
      .list-card.cdk-drag-placeholder { opacity: 0.3; }

      /* ── Task content layout ── */
      .task-content {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
        flex: 1;
        min-width: 0;
      }
      .task-main-row {
        display: flex;
        align-items: center;
        gap: 0.2rem;
      }

      /* ── Due date display ── */
      .task-due {
        display: flex;
        align-items: center;
      }

      .due-date-btn {
        background: rgba(255,255,255,0.6);
        border: 1px solid rgba(45,26,16,0.15);
        border-radius: 4px;
        padding: 0.1rem 0.4rem;
        font-size: 0.72rem;
        font-weight: 600;
        cursor: pointer;
        color: #52525b;
        font-family: inherit;
        transition: background 0.12s;
      }
      .due-date-btn:hover { background: rgba(255,255,255,0.9); }
      .due-date-btn--overdue {
        color: #b91c1c;
        border-color: rgba(185,28,28,0.3);
        background: rgba(185,28,28,0.08);
      }

      .calendar-icon-btn {
        background: transparent;
        border: none;
        padding: 0.1rem 0.25rem;
        font-size: 0.85rem;
        cursor: pointer;
        opacity: 0.4;
        transition: opacity 0.12s;
        line-height: 1;
      }
      .calendar-icon-btn:hover { opacity: 0.8; background: transparent; }

      /* ── Due date popover wrapper ── */
      .due-date-popover-wrap {
        padding: 0.25rem 0;
      }

      /* ══════════════════════════════════════════════════════════
         STUDY SESSION
         ══════════════════════════════════════════════════════════ */

      .study-session {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .study-session__header {
        display: flex;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .study-session__back {
        background: rgba(255,255,255,0.85);
        border: 1px solid rgba(0,0,0,0.12);
        border-radius: 8px;
        padding: 0.5rem 1rem;
        font: inherit;
        font-size: 0.875rem;
        font-weight: 700;
        cursor: pointer;
        color: #3f3f46;
        transition: background 0.12s;
      }
      .study-session__back:hover { background: rgba(255,255,255,1); }

      .study-session__title {
        margin: 0;
        font-size: 1.2rem;
        color: rgba(255,255,255,0.92);
        text-shadow: 0 1px 4px rgba(0,0,0,0.3);
      }

      .study-session__panels {
        display: grid;
        grid-template-columns: 1fr 320px;
        gap: 1rem;
        align-items: start;
      }

      @media (max-width: 700px) {
        .study-session__panels {
          grid-template-columns: 1fr;
        }
        .study-panel--timer { order: -1; }
      }

      .study-panel {
        border-radius: 12px;
        padding: 1rem;
        box-shadow: 0 8px 24px rgba(0,0,0,0.22), 0 2px 6px rgba(0,0,0,0.12);
        border: 1px solid rgba(255,255,255,0.5);
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .study-panel--timer {
        background: transparent;
        padding: 0;
        box-shadow: none;
        border: none;
      }

      .study-panel__title {
        margin: 0;
        font-size: 1rem;
        font-weight: 800;
      }

      .study-task-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
      }

      .study-task {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: rgba(255,255,255,0.55);
        border-radius: 6px;
        padding: 0.35rem 0.6rem;
      }

      .study-task input[type="checkbox"] { cursor: pointer; flex-shrink: 0; }

      .study-task__text {
        font-size: 0.875rem;
        line-height: 1.4;
      }
      .study-task__text--done {
        text-decoration: line-through;
        opacity: 0.5;
      }

      .study-new-task {
        display: flex;
        gap: 0.4rem;
        align-items: center;
        margin-top: 0.25rem;
      }
      .study-new-task input {
        flex: 1;
        border: 1px solid rgba(45,26,16,0.18);
        border-radius: 6px;
        padding: 0.45rem 0.65rem;
        background: rgba(255,255,255,0.75);
        color: inherit;
        font: inherit;
        font-size: 0.875rem;
      }
      .study-new-task input::placeholder { color: rgba(45,26,16,0.35); }
      .study-new-task input:focus { outline: none; border-color: var(--lc-accent, #4a7eb5); }
      .study-new-task button {
        background: var(--lc-accent, #3d8ed4);
        border: none;
        border-radius: 8px;
        padding: 0.45rem 0.9rem;
        color: #fff;
        font-weight: 800;
        font-size: 0.85rem;
        font-family: inherit;
        cursor: pointer;
        transition: opacity 0.12s;
      }
      .study-new-task button:hover { opacity: 0.88; }
      .study-new-task button:disabled { opacity: 0.4; cursor: not-allowed; }
    `
  ]
})
export class LockerComponent implements AfterViewInit, OnInit {
  private readonly sessionStore = inject(SessionStore);
  private readonly router = inject(Router);

  protected readonly isAdmin = this.sessionStore.isAdmin;

  protected readonly LOCKER_COLORS = LOCKER_COLORS;
  protected readonly LOCKER_FONTS = LOCKER_FONTS;
  protected lockerColor = signal<LockerColor>(this.loadLockerColor());
  protected lockerFont = signal<LockerFont>(this.loadLockerFont());

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
  protected readonly bookmarkLists = signal<BookmarkList[]>([]);
  protected readonly stickers = signal<Sticker[]>([]);
  protected stickerPickerOpen = false;
  protected taskDrafts: Record<string, string> = {};
  protected errorMessage = '';
  protected editDrafts: Record<string, string> = {};

  protected readonly colorPalette = DEFAULT_PALETTE;

  private readonly editingTaskIds = new Set<string>();
  protected colorDrafts: Record<string, string> = {};
  protected colorOriginals: Record<string, string> = {};

  // New Phase 1 state
  protected colorPickerListId: string | null = null;
  protected colorDraftTextColors: Record<string, string | null> = {};
  protected confirmDeleteList: TaskList | null = null;
  protected confirmCleanList: TaskList | null = null;
  protected dueDatePopoverTaskId: string | null = null;
  protected dueDatePopoverListId: string | null = null;
  protected fontPickerOpen = false;

  protected noteMenuOpen = false;

  protected readonly atListLimit = computed(() => this.taskLists().length >= 20);
  protected readonly atTimerLimit = computed(() => this.timers().length >= 10);
  protected readonly atNoteLimit = computed(() => this.notes().length >= 20);
  protected readonly atBookmarkListLimit = computed(() => this.bookmarkLists().length >= 10);
  protected readonly atStickerLimit = computed(() => this.stickers().length >= 30);
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

  private readonly cardOrder = signal<Array<{ type: 'TASK_LIST' | 'TIMER' | 'NOTE' | 'BOOKMARK_LIST' | 'BOOKMARK_LIST'; id: string }>>([]);

  protected readonly orderedCards = computed((): LockerCard[] => {
    const lists = this.taskLists();
    const timers = this.timers();
    const notes = this.notes();
    const bookmarkLists = this.bookmarkLists();
    const order = this.cardOrder();
    const listMap = new Map(lists.map(l => [l.id, l]));
    const timerMap = new Map(timers.map(t => [t.id, t]));
    const noteMap = new Map(notes.map(n => [n.id, n]));
    const bookmarkMap = new Map(bookmarkLists.map(b => [b.id, b]));
    if (order.length === 0) {
      return [
        ...lists.map(l => ({ type: 'TASK_LIST' as const, data: l })),
        ...timers.map(t => ({ type: 'TIMER' as const, data: t })),
        ...notes.map(n => ({ type: 'NOTE' as const, data: n })),
        ...bookmarkLists.map(b => ({ type: 'BOOKMARK_LIST' as const, data: b })),
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
      } else if (type === 'BOOKMARK_LIST') {
        const bl = bookmarkMap.get(id);
        if (bl) result.push({ type: 'BOOKMARK_LIST', data: bl });
      }
    });
    // Append newly created cards not yet in saved order
    lists.forEach(l => { if (!order.find(o => o.type === 'TASK_LIST' && o.id === l.id)) result.push({ type: 'TASK_LIST', data: l }); });
    timers.forEach(t => { if (!order.find(o => o.type === 'TIMER' && o.id === t.id)) result.push({ type: 'TIMER', data: t }); });
    notes.forEach(n => { if (!order.find(o => o.type === 'NOTE' && o.id === n.id)) result.push({ type: 'NOTE', data: n }); });
    bookmarkLists.forEach(b => { if (!order.find(o => o.type === 'BOOKMARK_LIST' && o.id === b.id)) result.push({ type: 'BOOKMARK_LIST', data: b }); });
    return result;
  });

  @ViewChildren('taskInput') private taskInputRefs!: QueryList<ElementRef<HTMLInputElement>>;
  @ViewChildren('editInput') private editInputRefs!: QueryList<ElementRef<HTMLInputElement>>;
  private pendingFocusListId: string | null = null;

  constructor(
    private readonly taskApi: TaskApiService,
    private readonly timerApi: TimerApiService,
    private readonly noteApi: NoteApiService,
    private readonly bookmarkApi: BookmarkApiService,
    private readonly stickerApi: StickerApiService,
    private readonly lockerLayoutApi: LockerLayoutApiService,
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
      this.bookmarkApi.getBookmarkLists(),
      this.stickerApi.getStickers(),
    ]).subscribe({
      next: ([lists, timers, notes, bookmarkLists, stickers]) => {
        this.taskLists.set(lists);
        this.timers.set(timers);
        this.notes.set(notes);
        this.bookmarkLists.set(bookmarkLists);
        this.stickers.set(stickers);
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

  // --- Card-level drag-drop (grid reordering) ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected reorderCards(event: CdkDragDrop<any[]>): void {
    const cards = [...this.orderedCards()];
    moveItemInArray(cards, event.previousIndex, event.currentIndex);
    const newOrder = cards.map(c => ({ type: c.type as 'TASK_LIST' | 'TIMER' | 'NOTE' | 'BOOKMARK_LIST', id: c.data.id }));
    this.cardOrder.set(newOrder);
    this.saveLockerLayout(newOrder);
  }

  private saveLockerLayout(order?: Array<{ type: 'TASK_LIST' | 'TIMER' | 'NOTE' | 'BOOKMARK_LIST'; id: string }>): void {
    const cards = order ?? this.orderedCards().map(c => ({ type: c.type as 'TASK_LIST' | 'TIMER' | 'NOTE' | 'BOOKMARK_LIST', id: c.data.id }));
    const items = cards.map(({ type, id }, index) => ({
      cardType: type,
      cardId: id,
      sortOrder: index,
    }));
    this.lockerLayoutApi.saveLayout(items).subscribe({ error: () => {} });
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
  protected asBookmarkList(card: LockerCard): BookmarkList | null {
    return card.type === 'BOOKMARK_LIST' ? (card.data as BookmarkList) : null;
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
        this.saveLockerLayout();
        setTimeout(() => this.scrollToTimer(timer.id), 80);
      },
      error: () => { this.errorMessage = 'Unable to create a timer right now. Please try again.'; },
    });
  }

  private insertTimerAfterList(timerId: string, listId: string): void {
    const current = this.orderedCards()
      .map(c => ({ type: c.type as 'TASK_LIST' | 'TIMER' | 'NOTE' | 'BOOKMARK_LIST', id: c.data.id }))
      .filter(o => !(o.type === 'TIMER' && o.id === timerId));
    const listIdx = current.findIndex(o => o.type === 'TASK_LIST' && o.id === listId);
    if (listIdx !== -1) {
      current.splice(listIdx + 1, 0, { type: 'TIMER', id: timerId });
    } else {
      current.push({ type: 'TIMER', id: timerId });
    }
    this.cardOrder.set(current);
  }

  private scrollToTimer(timerId: string): void {
    const el = document.getElementById('timer-' + timerId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      el.classList.add('timer-flash');
      setTimeout(() => el.classList.remove('timer-flash'), 900);
    }
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
        this.saveLockerLayout();
      },
      error: () => { this.errorMessage = 'Unable to create a timer right now. Please try again.'; },
    });
  }

  protected onTimerUpdated(updated: Timer): void {
    const prev = this.timers().find(t => t.id === updated.id);
    this.timers.update(current => current.map(t => t.id === updated.id ? updated : t));
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
        this.saveLockerLayout();
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

  // --- Bookmark List CRUD ---
  protected createBookmarkList(): void {
    if (this.atBookmarkListLimit()) return;
    const existingTitles = this.bookmarkLists().map(l => l.title);
    const title = nextAutoName(existingTitles, 'Bookmarks');
    const color = this.nextAvailableColor();
    this.bookmarkApi.createBookmarkList({ title, color }).subscribe({
      next: list => {
        this.bookmarkLists.update(current => [...current, list]);
        this.errorMessage = '';
        this.saveLockerLayout();
      },
      error: () => { this.errorMessage = 'Unable to create a bookmark list right now. Please try again.'; },
    });
  }

  protected onBookmarkListUpdated(updated: BookmarkList): void {
    this.bookmarkLists.update(current => current.map(l => l.id === updated.id ? updated : l));
  }

  protected onBookmarkListDeleted(listId: string): void {
    this.bookmarkLists.update(current => current.filter(l => l.id !== listId));
    this.cardOrder.update(order => order.filter(o => !(o.type === 'BOOKMARK_LIST' && o.id === listId)));
    this.saveLockerLayout();
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
  protected toggleStickerPicker(): void {
    this.stickerPickerOpen = !this.stickerPickerOpen;
  }

  protected onEmojiSelected(emoji: string): void {
    this.stickerPickerOpen = false;
    if (this.atStickerLimit()) return;
    // Place near center of visible locker area
    const x = 120 + Math.round(Math.random() * 200);
    const y = 80 + Math.round(Math.random() * 120);
    this.stickerApi.createSticker({ emoji, positionX: x, positionY: y, size: 'medium' }).subscribe({
      next: sticker => this.stickers.update(current => [...current, sticker]),
      error: () => { this.errorMessage = 'Unable to add sticker. Please try again.'; },
    });
  }

  protected onStickerPositionChanged(id: string, x: number, y: number): void {
    // Optimistic update
    this.stickers.update(current => current.map(s => s.id === id ? { ...s, positionX: x, positionY: y } : s));
    const sticker = this.stickers().find(s => s.id === id);
    if (!sticker) return;
    this.stickerApi.updateSticker(id, { positionX: x, positionY: y, size: sticker.size }).subscribe();
  }

  protected onStickerSizeChanged(id: string, size: string): void {
    this.stickers.update(current => current.map(s => s.id === id ? { ...s, size: size as any } : s));
    const sticker = this.stickers().find(s => s.id === id);
    if (!sticker) return;
    this.stickerApi.updateSticker(id, { positionX: sticker.positionX, positionY: sticker.positionY, size: sticker.size }).subscribe();
  }

  protected onStickerDeleted(id: string): void {
    this.stickers.update(current => current.filter(s => s.id !== id));
    this.stickerApi.deleteSticker(id).subscribe({
      error: () => this.stickers.update(current => current), // no recovery needed, already removed optimistically
    });
  }

  private nextAvailableColor(): string {
    const used = new Set([
      ...this.taskLists().map(l => l.color),
      ...this.timers().map(t => t.color),
      ...this.notes().map(n => n.color),
      ...this.bookmarkLists().map(l => l.color),
    ]);
    return this.colorPalette.find(color => !used.has(color)) ?? this.colorPalette[0];
  }
}
