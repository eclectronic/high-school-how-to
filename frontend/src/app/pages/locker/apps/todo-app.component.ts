import { Component, Input, Output, EventEmitter, OnInit, AfterViewChecked, signal, computed, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { TaskApiService } from '../../../core/services/task-api.service';
import { TaskList, TaskItem } from '../../../core/models/task.models';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { InlineTitleEditComponent } from '../../../shared/inline-title-edit/inline-title-edit.component';
import { SwatchPickerComponent } from '../../../shared/swatch-picker/swatch-picker.component';
import { DueDatePopoverComponent } from '../../../shared/due-date-popover/due-date-popover.component';
import { autoContrastColor, DEFAULT_PALETTE } from '../../../shared/color-picker/color-utils';

@Component({
  selector: 'app-todo-app',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    ConfirmDialogComponent,
    InlineTitleEditComponent,
    SwatchPickerComponent,
    DueDatePopoverComponent,
  ],
  templateUrl: './todo-app.component.html',
  styleUrl: './todo-app.component.scss',
})
export class TodoAppComponent implements OnInit, AfterViewChecked {
  @Input() paletteColor = '#1a6fa0';
  @Output() subtitleChange = new EventEmitter<string>();
  @Output() headerColorChange = new EventEmitter<string | null>();

  private readonly taskApi = inject(TaskApiService);

  @ViewChild('listTitle') listTitleRef?: InlineTitleEditComponent;
  @ViewChild('taskInput') taskInputRef?: ElementRef<HTMLInputElement>;

  protected lists = signal<TaskList[]>([]);
  protected sortMode = signal<'name' | 'custom'>(this.readStoredSortMode());
  protected readonly sortedLists = computed(() => {
    const list = this.lists();
    if (this.sortMode() === 'name') {
      return list.slice().sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
    }
    return list.slice().sort((a, b) => {
      const sa = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const sb = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
      return sa - sb;
    });
  });
  protected view = signal<'list' | 'detail'>('list');
  protected selectedList = signal<TaskList | null>(null);
  protected loading = signal(false);

  protected newTaskDesc = '';
  private pendingListTitleFocus = false;
  protected deleteListTarget = signal<TaskList | null>(null);
  protected deleteTaskTarget = signal<{ listId: string; taskId: string; desc: string } | null>(null);
  protected showColorPickerForList = signal<string | null>(null);
  protected showDueDateForTask = signal<string | null>(null);
  protected dueDateTask = computed(() => {
    const id = this.showDueDateForTask();
    if (!id) return null;
    return this.selectedList()?.tasks.find(t => t.id === id) ?? null;
  });
  protected colorPickerList = computed(() => {
    const id = this.showColorPickerForList();
    if (!id) return null;
    return this.lists().find(l => l.id === id) ?? null;
  });

  ngAfterViewChecked(): void {
    if (this.pendingListTitleFocus && this.listTitleRef) {
      this.pendingListTitleFocus = false;
      this.listTitleRef.startEdit();
    }
  }

  ngOnInit(): void {
    this.subtitleChange.emit('');
    this.loadLists();
  }

  private readStoredSortMode(): 'name' | 'custom' {
    try {
      const raw = localStorage.getItem('todo.sortMode');
      if (raw === 'name' || raw === 'custom') return raw;
    } catch { /* non-fatal */ }
    return 'custom';
  }

  protected setSortMode(mode: 'name' | 'custom'): void {
    this.sortMode.set(mode);
    try { localStorage.setItem('todo.sortMode', mode); } catch { /* non-fatal */ }
  }

  protected onDropList(event: CdkDragDrop<TaskList[]>): void {
    if (this.sortMode() !== 'custom') return;
    if (event.previousIndex === event.currentIndex) return;
    const reordered = this.sortedLists().slice();
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    const withOrder = reordered.map((l, i) => ({ ...l, sortOrder: i }));
    const byId = new Map(withOrder.map(l => [l.id, l]));
    this.lists.update(ls => ls.map(l => byId.get(l.id) ?? l));
    this.taskApi.reorderLists(withOrder.map(l => l.id)).subscribe({
      error: () => this.loadLists(),
    });
  }

  private loadLists(): void {
    this.loading.set(true);
    this.taskApi.getTaskLists().subscribe({
      next: lists => {
        this.lists.set(lists);
        this.loading.set(false);
        // Refresh selectedList if we're in detail view
        if (this.view() === 'detail' && this.selectedList()) {
          const refreshed = lists.find(l => l.id === this.selectedList()!.id);
          if (refreshed) this.selectedList.set(refreshed);
        }
      },
      error: () => this.loading.set(false),
    });
  }

  protected openList(list: TaskList): void {
    this.selectedList.set(list);
    this.view.set('detail');
    this.headerColorChange.emit(list.color);
  }

  protected toolbarBg(color: string | null | undefined): string {
    if (!color) return 'rgba(255, 255, 255, 0.35)';
    return `color-mix(in srgb, ${color} 88%, #000)`;
  }

  protected goBack(): void {
    this.view.set('list');
    this.selectedList.set(null);
    this.newTaskDesc = '';
    this.headerColorChange.emit(null);
  }

  protected createList(): void {
    const color = DEFAULT_PALETTE[Math.floor(Math.random() * DEFAULT_PALETTE.length)];
    const textColor = autoContrastColor(color);
    this.taskApi.createList('New List', color, textColor).subscribe({
      next: list => {
        this.lists.update(l => [...l, list]);
        this.openList(list);
        this.pendingListTitleFocus = true;
      },
    });
  }

  protected focusTaskInput(): void {
    setTimeout(() => this.taskInputRef?.nativeElement?.focus());
  }

  protected onListTitleChange(list: TaskList, newTitle: string): void {
    this.taskApi.updateListTitle(list.id, newTitle).subscribe({
      next: updated => {
        this.lists.update(ls => ls.map(l => l.id === updated.id ? updated : l));
        if (this.selectedList()?.id === updated.id) {
          this.selectedList.set(updated);
        }
      },
    });
  }

  protected confirmDeleteList(list: TaskList): void {
    this.deleteListTarget.set(list);
  }

  protected onDeleteListConfirmed(): void {
    const target = this.deleteListTarget();
    if (!target) return;
    this.taskApi.deleteList(target.id).subscribe({
      next: () => {
        this.lists.update(ls => ls.filter(l => l.id !== target.id));
        this.deleteListTarget.set(null);
        if (this.selectedList()?.id === target.id) {
          this.goBack(); // goBack already emits 'List'
        }
      },
    });
  }

  protected onDeleteListCancelled(): void {
    this.deleteListTarget.set(null);
  }

  protected toggleColorPicker(listId: string): void {
    this.showColorPickerForList.update(id => id === listId ? null : listId);
  }

  protected onColorChange(list: TaskList, color: string): void {
    const textColor = autoContrastColor(color.startsWith('#') ? color : '#3d8ed4');

    // Optimistic update — apply immediately so the UI reflects the change at once
    const optimistic = { ...list, color, textColor };
    this.lists.update(ls => ls.map(l => l.id === list.id ? optimistic : l));
    if (this.selectedList()?.id === list.id) {
      this.selectedList.set(optimistic);
      this.headerColorChange.emit(color);
    }
    this.showColorPickerForList.set(null);

    this.taskApi.updateListColor(list.id, color, textColor).subscribe({
      next: updated => {
        this.lists.update(ls => ls.map(l => l.id === updated.id ? updated : l));
        if (this.selectedList()?.id === updated.id) this.selectedList.set(updated);
      },
    });
  }

  protected onTaskDescChange(task: TaskItem, description: string): void {
    const list = this.selectedList();
    if (!list) return;
    this.taskApi.updateTask(list.id, task.id, { description }).subscribe({
      next: updated => {
        this.lists.update(ls => ls.map(l =>
          l.id === list.id
            ? { ...l, tasks: l.tasks.map(t => t.id === task.id ? updated : t) }
            : l
        ));
        const refreshed = this.lists().find(l => l.id === list.id);
        if (refreshed) this.selectedList.set(refreshed);
      },
    });
  }

  protected addTask(): void {
    const desc = this.newTaskDesc.trim();
    const list = this.selectedList();
    if (!desc || !list) return;

    this.taskApi.addTask(list.id, desc).subscribe({
      next: task => {
        this.newTaskDesc = '';
        this.lists.update(ls => ls.map(l =>
          l.id === list.id ? { ...l, tasks: [...l.tasks, task] } : l
        ));
        const refreshed = this.lists().find(l => l.id === list.id);
        if (refreshed) this.selectedList.set(refreshed);
      },
    });
  }

  protected toggleTask(task: TaskItem): void {
    const list = this.selectedList();
    if (!list) return;

    this.taskApi.updateTask(list.id, task.id, { completed: !task.completed }).subscribe({
      next: updated => {
        this.lists.update(ls => ls.map(l =>
          l.id === list.id
            ? { ...l, tasks: l.tasks.map(t => t.id === task.id ? updated : t) }
            : l
        ));
        const refreshed = this.lists().find(l => l.id === list.id);
        if (refreshed) this.selectedList.set(refreshed);
      },
    });
  }

  protected confirmDeleteTask(listId: string, task: TaskItem): void {
    this.deleteTaskTarget.set({ listId, taskId: task.id, desc: task.description });
  }

  protected onDeleteTaskConfirmed(): void {
    const target = this.deleteTaskTarget();
    if (!target) return;
    this.taskApi.deleteTask(target.listId, target.taskId).subscribe({
      next: () => {
        this.lists.update(ls => ls.map(l =>
          l.id === target.listId
            ? { ...l, tasks: l.tasks.filter(t => t.id !== target.taskId) }
            : l
        ));
        const list = this.selectedList();
        if (list?.id === target.listId) {
          const refreshed = this.lists().find(l => l.id === target.listId);
          if (refreshed) this.selectedList.set(refreshed);
        }
        this.deleteTaskTarget.set(null);
      },
    });
  }

  protected onDeleteTaskCancelled(): void {
    this.deleteTaskTarget.set(null);
  }

  protected onTaskDrop(event: CdkDragDrop<TaskItem[]>): void {
    const list = this.selectedList();
    if (!list) return;
    if (event.previousIndex === event.currentIndex) return;

    // Optimistically reorder locally so the UI updates immediately
    const reordered = list.tasks.slice();
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    const optimistic = { ...list, tasks: reordered };
    this.lists.update(ls => ls.map(l => l.id === list.id ? optimistic : l));
    this.selectedList.set(optimistic);

    const ids = reordered.map(t => t.id);
    this.taskApi.reorderTasks(list.id, ids).subscribe({
      next: updatedTasks => {
        // Use the server's canonical task ordering in case sortOrder landed differently
        this.lists.update(ls => ls.map(l =>
          l.id === list.id ? { ...l, tasks: updatedTasks } : l
        ));
        const refreshed = this.lists().find(l => l.id === list.id);
        if (refreshed) this.selectedList.set(refreshed);
      },
      error: () => {
        // On failure, reload from the server
        this.loadLists();
      },
    });
  }

  protected onListBtnKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const dir = event.key === 'ArrowDown' ? 1 : -1;
    const btns = Array.from(
      (event.currentTarget as HTMLElement)
        .closest('.todo-app__list-view')
        ?.querySelectorAll<HTMLElement>('.todo-list-row__btn') ?? []
    );
    const idx = btns.indexOf(event.currentTarget as HTMLElement);
    btns[idx + dir]?.focus();
  }

  protected onTaskKeydown(event: KeyboardEvent, task: TaskItem): void {
    switch (event.key) {
      case ' ':
        event.preventDefault();
        this.toggleTask(task);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.focusAdjacentTask(event.currentTarget as HTMLElement, 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusAdjacentTask(event.currentTarget as HTMLElement, -1);
        break;
    }
  }

  protected onDetailKeydown(event: KeyboardEvent): void {
    const tag = (event.target as HTMLElement).tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    if (event.key === 'a' || event.key === 'A' || event.key === '+') {
      event.preventDefault();
      this.focusTaskInput();
    }
  }

  private focusAdjacentTask(current: HTMLElement, dir: 1 | -1): void {
    const tasks = Array.from(
      current.closest('.todo-app__tasks')?.querySelectorAll<HTMLElement>('.todo-task') ?? []
    );
    const idx = tasks.indexOf(current);
    tasks[idx + dir]?.focus();
  }

  protected toggleDueDatePopover(taskId: string): void {
    this.showDueDateForTask.update(id => id === taskId ? null : taskId);
  }

  protected onDueDateChange(task: TaskItem, dueAt: string | null): void {
    const list = this.selectedList();
    if (!list) return;

    const payload = dueAt === null
      ? { clearDueAt: true }
      : { dueAt, clearDueAt: false };

    this.taskApi.updateTask(list.id, task.id, payload).subscribe({
      next: updated => {
        this.lists.update(ls => ls.map(l =>
          l.id === list.id
            ? { ...l, tasks: l.tasks.map(t => t.id === task.id ? updated : t) }
            : l
        ));
        const refreshed = this.lists().find(l => l.id === list.id);
        if (refreshed) this.selectedList.set(refreshed);
        this.showDueDateForTask.set(null);
      },
    });
  }

  protected getCompletedCount(list: TaskList): number {
    return list.tasks.filter(t => t.completed).length;
  }

  protected formatDueDate(dueAt: string): string {
    const d = new Date(dueAt);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  protected isDueOverdue(dueAt: string): boolean {
    return new Date(dueAt).getTime() < Date.now();
  }
}
