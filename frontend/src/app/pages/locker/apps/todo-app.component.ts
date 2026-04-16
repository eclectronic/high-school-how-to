import { Component, Input, Output, EventEmitter, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { TaskApiService } from '../../../core/services/task-api.service';
import { TaskList, TaskItem } from '../../../core/models/task.models';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { InlineTitleEditComponent } from '../../../shared/inline-title-edit/inline-title-edit.component';
import { SwatchPickerComponent } from '../../../shared/swatch-picker/swatch-picker.component';
import { DueDatePopoverComponent } from '../../../shared/due-date-popover/due-date-popover.component';
import { autoContrastColor } from '../../../shared/color-picker/color-utils';

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
export class TodoAppComponent implements OnInit {
  @Input() paletteColor = '#1a6fa0';
  @Output() subtitleChange = new EventEmitter<string>();
  @Output() headerColorChange = new EventEmitter<string | null>();

  private readonly taskApi = inject(TaskApiService);

  protected lists = signal<TaskList[]>([]);
  protected view = signal<'list' | 'detail'>('list');
  protected selectedList = signal<TaskList | null>(null);
  protected loading = signal(false);

  protected newTaskDesc = '';
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

  ngOnInit(): void {
    this.subtitleChange.emit('');
    this.loadLists();
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
    this.subtitleChange.emit(list.title);
    this.headerColorChange.emit(list.color);
  }

  protected goBack(): void {
    this.view.set('list');
    this.selectedList.set(null);
    this.newTaskDesc = '';
    this.subtitleChange.emit('');
    this.headerColorChange.emit(null);
  }

  protected createList(): void {
    this.taskApi.createList('New List').subscribe({
      next: list => {
        this.lists.update(l => [...l, list]);
        this.openList(list);
      },
    });
  }

  protected onListTitleChange(list: TaskList, newTitle: string): void {
    this.taskApi.updateListTitle(list.id, newTitle).subscribe({
      next: updated => {
        this.lists.update(ls => ls.map(l => l.id === updated.id ? updated : l));
        if (this.selectedList()?.id === updated.id) {
          this.selectedList.set(updated);
          this.subtitleChange.emit(updated.title);
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
