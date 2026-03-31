import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, QueryList, ViewChildren, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { forkJoin } from 'rxjs';
import { TaskApiService } from '../../../core/services/task-api.service';
import { TaskItem, TaskList } from '../../../core/models/task.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DragDropModule],
  template: `
    <section class="dashboard">
      <header class="dashboard__header">
        <div class="top-row">
          <div class="brand">
            <a routerLink="/" class="brand__link">
              <img src="/assets/images/home-logo.png" alt="High School How To" />
              <div class="brand__text">
                <h1>Focus Board</h1>
              </div>
            </a>
          </div>
          <nav class="nav-links">
            <a routerLink="/" class="nav-link">Home</a>
          </nav>
        </div>
        <form class="new-list" (ngSubmit)="createList()" #listForm="ngForm">
          <label>
            <span class="sr-only">New list title</span>
            <input
              #listTitleInput
              name="title"
              [(ngModel)]="newListTitle"
              placeholder="List Name"
              required
              minlength="1"
            />
          </label>
          <button type="submit" [disabled]="!newListTitle.trim()">Create Todos</button>
        </form>
        <p *ngIf="errorMessage" class="error">{{ errorMessage }}</p>
      </header>

      <div class="lists" *ngIf="taskLists().length; else emptyState">
        <article
          class="list-card"
          *ngFor="let list of taskLists(); trackBy: trackByListId"
          [style.background]="list.color || '#fffef8'"
        >
          <header class="list-card__header">
            <h3>{{ list.title }}</h3>
            <div
              class="list-actions"
              *ngIf="!isPendingDelete(list.id) && !isPendingClean(list.id); else confirmActions"
            >
              <button type="button" class="ghost clean" (click)="requestClean(list)"><span class="clean__label">Clean</span></button>
              <button type="button" class="ghost danger" (click)="requestDelete(list)">Delete</button>
              <button
                type="button"
                class="icon-button gear"
                aria-label="List settings"
                (click)="toggleConfig(list)"
              >
                <span aria-hidden="true">⚙︎</span>
              </button>
            </div>
            <ng-template #confirmActions>
              <div class="confirm-bar">
                <span *ngIf="isPendingDelete(list.id)">Delete this list?</span>
                <span *ngIf="isPendingClean(list.id)">Remove completed todos?</span>
                <button
                  type="button"
                  class="danger"
                  *ngIf="isPendingDelete(list.id)"
                  (click)="deleteList(list)"
                >
                  Yes
                </button>
                <button
                  type="button"
                  class="danger"
                  *ngIf="isPendingClean(list.id)"
                  (click)="confirmCleanCompleted(list)"
                >
                  Yes
                </button>
                <button type="button" class="ghost" (click)="cancelPending(list.id)">No</button>
              </div>
            </ng-template>
            <div
              class="config-panel floating"
              *ngIf="configOpenId === list.id"
              (click)="$event.stopPropagation()"
              (keydown)="onConfigKeydown($event, list)"
              tabindex="-1"
            >
              <div class="config-row">
                <span>List name</span>
                <input
                  class="title-edit-input"
                  [(ngModel)]="titleDrafts[list.id]"
                  [ngModelOptions]="{ standalone: true }"
                  (keydown.enter)="saveTitleEdit(list, $event, true)"
                  (keydown.escape)="onConfigKeydown($event, list)"
                  (blur)="saveTitleEdit(list)"
                />
              </div>
              <div class="config-row">
                <span>Card color</span>
    <div class="swatches">
                  <button
                    type="button"
                    class="swatch"
                    *ngFor="let color of colorPalette; index as i"
                    [style.backgroundColor]="color"
                    [class.swatch--active]="color === list.color"
                    [id]="'swatch-' + list.id + '-' + i"
                    (click)="setCardColor(list, color)"
                    (keydown)="onSwatchKeydown($event, list, i)"
                    aria-label="Set card color to {{ color }}"
                  ></button>
                </div>
              </div>
              <button type="button" class="ghost" (click)="saveTitleEdit(list, undefined, true)">Done</button>
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
                <button
                  type="button"
                  class="task-text"
                  [class.completed]="task.completed"
                  (click)="startEdit(task)"
                >
                  {{ task.description }}
                </button>
                <button type="button" class="icon-button danger" (click)="removeTask(list, task)" aria-label="Remove task">
                  ×
                </button>
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
              placeholder="Todo"
              required
            />
            <button type="submit" [disabled]="!taskDrafts[list.id]?.trim()">Add Todo</button>
          </form>
        </article>
      </div>

      <ng-template #emptyState>
        <div class="empty-card">
          <div class="empty-card__header">
            <div class="pin" aria-hidden="true">📌</div>
            <h2>Let’s get organized</h2>
          </div>
          <p class="empty-card__lead">
            Welcome to your Focus Board. Start by creating a todo list—classes, projects, habits, anything you need to juggle—then add tasks.
          </p>
          <ul class="empty-card__steps">
            <li>Add your first todo list using the box above.</li>
            <li>Add tasks under any list and drag to reorder.</li>
            <li>Color-code lists to keep subjects and priorities clear.</li>
          </ul>
        </div>
      </ng-template>
    </section>
  `,
  styles: [
    `
      .dashboard {
        max-width: 1200px;
        margin: 0 auto;
        padding: clamp(1.5rem, 3vw, 3rem);
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        background: transparent;
        border-radius: 18px;
        box-shadow: none;
      }
      .dashboard__header {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
      }
      .top-row {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        width: 100%;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.5rem 0.9rem;
        background: #fffef8;
        border: 1px dashed rgba(45, 26, 16, 0.25);
        border-radius: 12px;
        box-shadow: 0 8px 16px rgba(45, 26, 16, 0.08);
      }
      .brand__link {
        display: inline-flex;
        align-items: center;
        gap: 0.75rem;
        color: inherit;
        text-decoration: none;
      }
      .brand img {
        height: 46px;
        width: auto;
        display: block;
      }
      .brand__text h1 {
        margin: 0;
      }
      .nav-links {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
      .nav-link {
        color: #2d1a10;
        text-decoration: none;
        font-weight: 800;
        border-radius: 999px;
        padding: 0.6rem 1.2rem;
        background: #fffef9;
        border: 2px solid #2d1a10;
        box-shadow: 0 12px 20px rgba(45, 26, 16, 0.15);
        transition: transform 120ms ease, box-shadow 120ms ease;
        display: inline-block;
      }
      .nav-link:hover {
        transform: translateY(-1px);
        box-shadow: 0 16px 26px rgba(45, 26, 16, 0.2);
      }
      .error {
        color: #b00020;
        margin: 0;
        font-weight: 600;
      }
      .eyebrow {
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 1px;
        font-weight: 700;
        color: #8a5cf5;
      }
      .new-list {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        flex-wrap: wrap;
        padding: 0.85rem 1rem;
        background: rgba(255, 254, 248, 0.82);
        border-radius: 14px;
        border: 1px dashed rgba(45, 26, 16, 0.18);
        box-shadow: 0 8px 18px rgba(45, 26, 16, 0.1);
      }
      .new-list input,
      .new-task input {
        border: 2px solid rgba(45, 26, 16, 0.2);
        border-radius: 0.65rem;
        padding: 0.55rem 0.75rem;
        min-width: 220px;
        background: #fffdf7;
      }
      button {
        border: 2px solid #2d1a10;
        border-radius: 0.6rem;
        padding: 0.55rem 0.95rem;
        background: #fffef8;
        color: #2d1a10;
        font-weight: 800;
        cursor: pointer;
        box-shadow: 0 8px 14px rgba(45, 26, 16, 0.12);
      }
      button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .ghost {
        background: rgba(255, 255, 255, 0.7);
        color: #2d1a10;
        border: 1px dashed rgba(45, 26, 16, 0.25);
        padding: 0.35rem 0.65rem;
      }
      .ghost.clean {
        background: rgba(130, 201, 255, 0.25);
        border-color: rgba(45, 26, 16, 0.18);
      }
      .clean__label {
        text-decoration: line-through;
      }
      .danger {
        border-color: rgba(176, 0, 32, 0.2);
        color: #8c1f24;
      }
      .icon-button {
        width: 2rem;
        height: 2rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        font-size: 1.1rem;
        line-height: 1;
        padding: 0;
        background: rgba(255, 255, 255, 0.8);
        border: 1px dashed rgba(45, 26, 16, 0.25);
        color: #2d1a10;
        transition: transform 120ms ease, box-shadow 120ms ease;
      }
      .icon-button.gear {
        background: #fff;
        border: 1px solid rgba(0, 0, 0, 0.4);
        color: #000;
        font-size: 1rem;
      }
      .icon-button:hover {
        transform: translateY(-1px);
        box-shadow: 0 8px 14px rgba(45, 26, 16, 0.12);
      }
      .lists {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1rem;
        align-items: start;
      }
      .list-card {
        border: 2px solid rgba(45, 26, 16, 0.2);
        border-radius: 1rem;
        padding: 1rem;
        background: linear-gradient(145deg, #fffef8 0%, #fff4d6 100%);
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        position: relative;
        box-shadow: 0 12px 20px rgba(45, 26, 16, 0.14);
        transform: none;
      }
      .list-card::before {
        content: '';
        position: absolute;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: radial-gradient(circle at 30% 30%, #fff 0%, #f7d977 45%, #c9861d 75%);
        box-shadow: 0 3px 6px rgba(45, 26, 16, 0.25);
      }
      .list-card__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.5rem;
        position: relative;
      }
      .list-actions {
        display: flex;
        gap: 0.4rem;
        align-items: center;
        position: absolute;
        top: 0.35rem;
        right: 0.35rem;
      }
      .confirm-bar {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: rgba(176, 0, 32, 0.06);
        border: 1px solid rgba(176, 0, 32, 0.2);
        border-radius: 0.6rem;
        padding: 0.35rem 0.5rem;
        color: #b00020;
      }
      .config-panel {
        padding: 0.5rem;
        border-radius: 0.6rem;
        border: 1px dashed rgba(45, 26, 16, 0.2);
        background: rgba(255, 255, 255, 0.95);
        display: inline-flex;
        flex-direction: column;
        gap: 0.5rem;
        position: absolute;
        top: 2.4rem;
        right: 0.5rem;
        z-index: 5;
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
      }
      .config-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 700;
      }
      .swatches {
        display: grid;
        grid-template-columns: repeat(4, 32px);
        gap: 0.35rem;
      }
      .swatch {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        border: 2px solid transparent;
        cursor: pointer;
        padding: 0;
      }
      .swatch--active {
        border-color: rgba(45, 26, 16, 0.5);
        box-shadow: 0 0 0 2px rgba(45, 26, 16, 0.12);
      }
      .task-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .task-list li {
        display: flex;
        align-items: stretch;
        justify-content: space-between;
        gap: 0.5rem;
        background: rgba(255, 255, 255, 0.75);
        border-radius: 0.5rem;
        padding: 0.25rem 0.35rem;
      }
      .drag-handle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.35rem;
        cursor: grab;
        color: #8a5c2f;
        font-size: 1rem;
        user-select: none;
      }
      .drag-handle:active {
        cursor: grabbing;
      }
      .task-row {
        flex: 1;
      }
      .task-list li.cdk-drag-preview {
        box-shadow: 0 12px 20px rgba(45, 26, 16, 0.16);
      }
      .task-list li.cdk-drag-placeholder {
        opacity: 0.2;
      }
      .task-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex: 1;
        justify-content: space-between;
      }
      .task-row.editing {
        align-items: stretch;
      }
      .task-list label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex: 1;
      }
      .task-list span.completed {
        color: #8a8a8a;
        text-decoration: line-through;
      }
      .new-task {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        background: rgba(255, 255, 255, 0.75);
        padding: 0.5rem;
        border-radius: 0.75rem;
        border: 1px dashed rgba(45, 26, 16, 0.16);
      }
      .empty {
        display: none;
      }
      .empty-card {
        background: #fffef8;
        border: 2px solid rgba(45, 26, 16, 0.2);
        border-radius: 1.25rem;
        padding: clamp(1.25rem, 3vw, 1.75rem);
        box-shadow: 0 14px 28px rgba(45, 26, 16, 0.12);
        max-width: 640px;
        margin: 0 auto;
        display: grid;
        gap: 0.75rem;
      }
      .empty-card__header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .empty-card__header h2 {
        margin: 0;
        font-size: 1.5rem;
      }
      .empty-card__lead {
        margin: 0;
        font-size: 1.05rem;
        line-height: 1.5;
      }
      .empty-card__steps {
        margin: 0;
        padding-left: 1.2rem;
        display: grid;
        gap: 0.35rem;
        font-weight: 600;
      }
      .empty-card__steps li {
        line-height: 1.5;
      }
      .task-actions {
        display: flex;
        gap: 0.4rem;
        align-items: center;
      }
      .title-edit-input {
        flex: 1;
        border: 2px solid rgba(45, 26, 16, 0.2);
        border-radius: 0.5rem;
        padding: 0.4rem 0.6rem;
        background: #fffdf7;
        min-width: 140px;
        font: inherit;
      }
      .edit-input {
        flex: 1;
        border: 2px solid rgba(45, 26, 16, 0.2);
        border-radius: 0.5rem;
        padding: 0.4rem 0.6rem;
        background: #fffdf7;
      }
      .task-text {
        flex: 1;
        background: transparent;
        border: none;
        text-align: left;
        padding: 0.35rem 0.5rem;
        font: inherit;
        color: #2d1a10;
        cursor: text;
      }
      .task-text.completed {
        color: #8a8a8a;
        text-decoration: line-through;
      }
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        border: 0;
      }
    `
  ]
})
export class DashboardComponent implements AfterViewInit {
  protected readonly taskLists = signal<TaskList[]>([]);
  protected newListTitle = '';
  protected taskDrafts: Record<string, string> = {};
  protected errorMessage = '';
  protected editDrafts: Record<string, string> = {};
  protected readonly colorPalette = [
    '#fffef8',
    '#fef3c7',
    '#fde68a',
    '#fcd34d',
    '#fef2f2',
    '#fecdd3',
    '#fda4af',
    '#fecdd3',
    '#ede9fe',
    '#ddd6fe',
    '#c7d2fe',
    '#bfdbfe',
    '#dcfce7',
    '#bbf7d0',
    '#a7f3d0',
    '#e0f2fe'
  ];
  private readonly editingTaskIds = new Set<string>();
  private readonly pendingDeleteIds = new Set<string>();
  private readonly pendingCleanIds = new Set<string>();
  protected configOpenId: string | null = null;
  protected colorDrafts: Record<string, string> = {};
  protected colorOriginals: Record<string, string> = {};
  protected titleDrafts: Record<string, string> = {};
  @ViewChildren('taskInput') private taskInputRefs!: QueryList<ElementRef<HTMLInputElement>>;
  @ViewChildren('editInput') private editInputRefs!: QueryList<ElementRef<HTMLInputElement>>;
  private pendingFocusListId: string | null = null;

  constructor(private readonly taskApi: TaskApiService) {
    effect(() => {
      this.loadLists();
    });
  }

  ngAfterViewInit(): void {
    this.taskInputRefs.changes.subscribe(() => {
      if (this.pendingFocusListId) {
        this.tryFocusTaskInput(this.pendingFocusListId);
      }
    });
  }

  private loadLists(): void {
    this.taskApi.getTaskLists().subscribe({
      next: lists => {
        this.taskLists.set(lists);
      },
      error: () => {
        this.errorMessage = 'Could not load your lists. Please log in again.';
      }
    });
  }

  protected createList(): void {
    const title = this.newListTitle.trim();
    if (!title) {
      return;
    }
    const color = this.nextAvailableColor();
    this.taskApi.createList(title, color).subscribe({
      next: list => {
        const withColor = { ...list, color };
        this.taskLists.update(current => [...current, withColor]);
        this.newListTitle = '';
        this.errorMessage = '';
      },
      error: () => {
        this.errorMessage = 'Unable to add a list right now. Please try again or sign in again.';
      }
    });
  }

  protected requestDelete(list: TaskList): void {
    this.pendingDeleteIds.add(list.id);
  }

  protected cancelDelete(listId: string): void {
    this.pendingDeleteIds.delete(listId);
  }

  protected toggleConfig(list: TaskList): void {
    if (this.configOpenId === list.id) {
      this.commitColor(list);
      return;
    }
    this.colorOriginals = { ...this.colorOriginals, [list.id]: list.color };
    this.colorDrafts = { ...this.colorDrafts, [list.id]: list.color };
    this.titleDrafts = { ...this.titleDrafts, [list.id]: list.title };
    this.configOpenId = list.id;
  }

  protected setCardColor(list: TaskList, color: string): void {
    this.colorDrafts = { ...this.colorDrafts, [list.id]: color };
    this.taskLists.update(current =>
      current.map(item => (item.id === list.id ? { ...item, color } : item))
    );
  }

  protected commitColor(list: TaskList): void {
    const draft = this.colorDrafts[list.id] ?? list.color;
    const original = this.colorOriginals[list.id] ?? list.color;
    if (!draft || draft === original) {
      this.configOpenId = null;
      return;
    }
    this.taskApi.updateListColor(list.id, draft).subscribe({
      next: updated => {
        this.taskLists.update(current =>
          current.map(item => (item.id === list.id ? { ...item, color: updated.color } : item))
        );
        this.colorOriginals = { ...this.colorOriginals, [list.id]: updated.color };
        this.colorDrafts = { ...this.colorDrafts, [list.id]: updated.color };
        this.configOpenId = null;
      },
      error: () => {
        this.errorMessage = 'Could not save card color. Please try again.';
        this.taskLists.update(current =>
          current.map(item => (item.id === list.id ? { ...item, color: original } : item))
        );
        this.configOpenId = null;
      }
    });
  }

  private revertColorDraft(listId: string, onlyIfChanged = false): void {
    const original = this.colorOriginals[listId];
    const draft = this.colorDrafts[listId];
    if (original === undefined) {
      return;
    }
    if (onlyIfChanged && draft === original) {
      return;
    }
    this.taskLists.update(current =>
      current.map(item => (item.id === listId ? { ...item, color: original } : item))
    );
    const { [listId]: _, ...restDrafts } = this.colorDrafts;
    const { [listId]: __, ...restOriginals } = this.colorOriginals;
    this.colorDrafts = restDrafts;
    this.colorOriginals = restOriginals;
  }

  protected saveTitleEdit(list: TaskList, event?: Event, closePanel = false): void {
    if (event instanceof KeyboardEvent) {
      event.preventDefault();
    }
    const draft = this.titleDrafts[list.id]?.trim();
    if (draft && draft !== list.title) {
      this.taskApi.updateListTitle(list.id, draft).subscribe({
        next: updated => {
          this.taskLists.update(current =>
            current.map(item => (item.id === list.id ? { ...item, title: updated.title } : item))
          );
        },
        error: () => {
          this.errorMessage = 'Could not save list name. Please try again.';
          this.titleDrafts = { ...this.titleDrafts, [list.id]: list.title };
        }
      });
    }
    if (closePanel) {
      this.commitColor(list);
    }
  }

  protected onConfigKeydown(event: Event, list: TaskList): void {
    if ((event as KeyboardEvent).key === 'Escape') {
      event.preventDefault();
      this.revertColorDraft(list.id);
      this.titleDrafts = { ...this.titleDrafts, [list.id]: list.title };
      this.configOpenId = null;
    }
  }

  protected onSwatchKeydown(event: KeyboardEvent, list: TaskList, index: number): void {
    const key = event.key;
    if (key === 'Enter') {
      event.preventDefault();
      this.commitColor(list);
      return;
    }
    if (key !== 'ArrowRight' && key !== 'ArrowDown' && key !== 'ArrowLeft' && key !== 'ArrowUp') {
      return;
    }
    event.preventDefault();
    const delta = key === 'ArrowRight' || key === 'ArrowDown' ? 1 : -1;
    const nextIndex = (index + delta + this.colorPalette.length) % this.colorPalette.length;
    const nextColor = this.colorPalette[nextIndex];
    this.setCardColor(list, nextColor);
    const nextId = `swatch-${list.id}-${nextIndex}`;
    setTimeout(() => document.getElementById(nextId)?.focus());
  }

  protected deleteList(list: TaskList): void {
    this.taskApi.deleteList(list.id).subscribe(() => {
      this.taskLists.update(current => current.filter(item => item.id !== list.id));
      this.pendingDeleteIds.delete(list.id);
    });
  }

  protected addTask(list: TaskList): void {
    const draft = this.taskDrafts[list.id]?.trim();
    if (!draft) {
      return;
    }
    this.taskApi.addTask(list.id, draft).subscribe(task => {
      this.taskLists.update(current =>
        current.map(item => (item.id === list.id ? { ...item, tasks: [...item.tasks, task] } : item))
      );
      this.taskDrafts = { ...this.taskDrafts, [list.id]: '' };
      this.focusTaskInput(list.id);
    });
  }

  protected toggleTask(list: TaskList, task: TaskItem, completed: boolean): void {
    this.taskApi.updateTask(list.id, task.id, { completed }).subscribe(updated => {
      this.taskLists.update(current =>
        current.map(item =>
          item.id === list.id
            ? { ...item, tasks: item.tasks.map(t => (t.id === task.id ? updated : t)) }
            : item
        )
      );
    });
  }

  protected clearCompleted(list: TaskList): void {
    const completed = list.tasks.filter(task => task.completed);
    if (!completed.length) {
      return;
    }

    const deletions = completed.map(task => this.taskApi.deleteTask(list.id, task.id));
    forkJoin(deletions).subscribe({
      next: () => {
        this.taskLists.update(current =>
          current.map(item =>
            item.id === list.id ? { ...item, tasks: item.tasks.filter(t => !t.completed) } : item
          )
        );
        this.errorMessage = '';
      },
      error: () => {
        this.errorMessage = 'Unable to clean completed items right now.';
      }
    });
  }

  protected removeTask(list: TaskList, task: TaskItem): void {
    this.taskApi.deleteTask(list.id, task.id).subscribe(() => {
      this.taskLists.update(current =>
        current.map(item =>
          item.id === list.id ? { ...item, tasks: item.tasks.filter(t => t.id !== task.id) } : item
        )
      );
    });
  }

  protected isEditing(taskId: string): boolean {
    return this.editingTaskIds.has(taskId);
  }

  protected isPendingDelete(listId: string): boolean {
    return this.pendingDeleteIds.has(listId);
  }

  protected isPendingClean(listId: string): boolean {
    return this.pendingCleanIds.has(listId);
  }

  protected requestClean(list: TaskList): void {
    if (list.tasks.every(task => !task.completed)) {
      return;
    }
    this.pendingCleanIds.add(list.id);
  }

  protected cancelPending(listId: string): void {
    this.pendingDeleteIds.delete(listId);
    this.pendingCleanIds.delete(listId);
  }

  protected confirmCleanCompleted(list: TaskList): void {
    this.pendingCleanIds.delete(list.id);
    this.clearCompleted(list);
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
    if (draft === task.description) {
      this.editingTaskIds.delete(task.id);
      return;
    }
    this.taskApi.updateTask(list.id, task.id, { description: draft }).subscribe(updated => {
      this.taskLists.update(current =>
        current.map(item =>
          item.id === list.id
            ? { ...item, tasks: item.tasks.map(t => (t.id === task.id ? updated : t)) }
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
      if (item.id !== list.id) {
        return item;
      }
      const tasks = [...item.tasks];
      moveItemInArray(tasks, event.previousIndex, event.currentIndex);
      return { ...item, tasks };
    });
    this.taskLists.set(updatedLists);

    const updatedList = updatedLists.find(l => l.id === list.id);
    if (!updatedList) {
      return;
    }
    const orderedIds = updatedList.tasks.map(t => t.id);
    this.taskApi.reorderTasks(list.id, orderedIds).subscribe({
      next: () => {
        this.errorMessage = '';
      },
      error: () => {
        this.errorMessage = 'Could not save task order. Please try again.';
        this.taskLists.set(
          this.taskLists().map(item => (item.id === list.id ? { ...item, tasks: prevOrder } : item))
        );
      }
    });
  }

  private focusTaskInput(listId: string): void {
    this.pendingFocusListId = listId;
    // Queue after DOM updates for both click and Enter submissions.
    requestAnimationFrame(() => {
      if (!this.tryFocusTaskInput(listId)) {
        setTimeout(() => this.tryFocusTaskInput(listId), 30);
      }
    });
  }

  private tryFocusTaskInput(listId: string): boolean {
    const ref = this.taskInputRefs?.find(el => el.nativeElement.dataset['listId'] === listId);
    const target = ref?.nativeElement ?? this.taskInputRefs?.last?.nativeElement;
    if (target) {
      target.focus();
      target.select();
      this.pendingFocusListId = null;
      return true;
    }
    return false;
  }

  private focusEditInput(taskId: string): void {
    const ref = this.editInputRefs?.find(el => el.nativeElement.dataset['taskId'] === taskId);
    ref?.nativeElement.focus();
  }

  protected trackByListId(_index: number, list: TaskList): string {
    return list.id;
  }

  private nextAvailableColor(): string {
    const used = new Set(this.taskLists().map(l => l.color));
    const firstUnused = this.colorPalette.find(color => !used.has(color));
    return firstUnused ?? this.colorPalette[0];
  }
}
