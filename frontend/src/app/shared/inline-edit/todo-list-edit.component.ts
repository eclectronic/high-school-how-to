import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  signal,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ContentCardTask } from '../../core/models/content.models';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { InlineTitleEditComponent } from '../inline-title-edit/inline-title-edit.component';
import { SwatchPickerComponent } from '../swatch-picker/swatch-picker.component';

interface EditTask {
  id: string;
  description: string;
}

let nextId = 0;

@Component({
  selector: 'app-todo-list-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, ConfirmDialogComponent, InlineTitleEditComponent, SwatchPickerComponent],
  templateUrl: './todo-list-edit.component.html',
  styleUrl: './todo-list-edit.component.scss',
})
export class TodoListEditComponent implements OnChanges {
  @Input() tasks: ContentCardTask[] = [];
  @Input() backgroundColor: string | null = null;
  @Input() textColor: string | null = null;

  @Output() tasksChange = new EventEmitter<{ description: string }[]>();
  @Output() backgroundColorChange = new EventEmitter<string>();
  @Output() textColorChange = new EventEmitter<string>();

  @ViewChild('taskInput') taskInputRef?: ElementRef<HTMLInputElement>;

  protected editTasks = signal<EditTask[]>([]);
  protected newTaskDesc = '';
  protected deleteTarget = signal<EditTask | null>(null);
  protected showColorPicker = signal(false);

  private lastIncomingJson = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tasks']) {
      const json = JSON.stringify(this.tasks.map(t => t.description));
      if (json !== this.lastIncomingJson) {
        this.lastIncomingJson = json;
        this.editTasks.set(
          this.tasks.map(t => ({ id: `t${t.id ?? ++nextId}`, description: t.description }))
        );
      }
    }
  }

  protected onTaskDrop(event: CdkDragDrop<EditTask[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const arr = this.editTasks().slice();
    moveItemInArray(arr, event.previousIndex, event.currentIndex);
    this.editTasks.set(arr);
    this.emit();
  }

  protected onTaskDescChange(task: EditTask, description: string): void {
    this.editTasks.update(ts => ts.map(t => t.id === task.id ? { ...t, description } : t));
    this.emit();
  }

  protected addTask(): void {
    const desc = this.newTaskDesc.trim();
    if (!desc) return;
    if (this.editTasks().length >= 50) return;
    this.editTasks.update(ts => [...ts, { id: `n${++nextId}`, description: desc }]);
    this.newTaskDesc = '';
    this.emit();
    setTimeout(() => this.taskInputRef?.nativeElement?.focus());
  }

  protected confirmDeleteTask(task: EditTask): void {
    this.deleteTarget.set(task);
  }

  protected onDeleteConfirmed(): void {
    const target = this.deleteTarget();
    if (!target) return;
    this.editTasks.update(ts => ts.filter(t => t.id !== target.id));
    this.deleteTarget.set(null);
    this.emit();
  }

  protected onDeleteCancelled(): void {
    this.deleteTarget.set(null);
  }

  protected onColorChange(color: string): void {
    this.showColorPicker.set(false);
    this.backgroundColorChange.emit(color);
  }

  private emit(): void {
    this.tasksChange.emit(this.editTasks().map(t => ({ description: t.description })));
  }
}
