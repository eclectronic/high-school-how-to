import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-widget-title-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="title-bar" [class.title-bar--minimized]="minimized">
      <!-- Drag handle -->
      <span class="title-bar__drag-handle" cdkDragHandle aria-hidden="true">≡</span>

      <!-- Title / inline edit -->
      @if (editing()) {
        <input
          #titleInput
          class="title-bar__title-input"
          [(ngModel)]="draft"
          (keydown.enter)="commitEdit()"
          (keydown.escape)="cancelEdit()"
          (blur)="onBlur()"
        />
      } @else {
        <span
          class="title-bar__title"
          (dblclick)="startEdit()"
          title="Double-click to rename"
        >{{ title }}</span>
      }

      <!-- Minimize / maximize button -->
      <button
        type="button"
        class="title-bar__btn"
        [title]="minimized ? 'Restore' : 'Minimize'"
        [attr.aria-label]="minimized ? 'Restore widget' : 'Minimize widget'"
        (click)="minimizeToggled.emit()"
      >{{ minimized ? '☐' : '—' }}</button>

      <!-- Close button -->
      <button
        type="button"
        class="title-bar__btn title-bar__btn--close"
        title="Delete"
        aria-label="Delete widget"
        (click)="closeClicked.emit()"
      >✕</button>
    </div>
  `,
  styles: [`
    .title-bar {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      height: 2rem;
      padding: 0 0.35rem;
      border-radius: 8px 8px 0 0;
      background: rgba(0, 0, 0, 0.08);
      user-select: none;
      cursor: grab;
    }

    .title-bar:active {
      cursor: grabbing;
    }

    .title-bar--minimized {
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.12);
    }

    .title-bar__drag-handle {
      font-size: 1rem;
      opacity: 0.45;
      flex-shrink: 0;
      line-height: 1;
      cursor: grab;
    }

    .title-bar__drag-handle:active {
      cursor: grabbing;
    }

    .title-bar__title {
      font-size: 0.875rem;
      font-weight: 700;
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      cursor: text;
    }

    .title-bar--minimized .title-bar__title {
      opacity: 0.7;
      font-weight: 600;
    }

    .title-bar__title-input {
      flex: 1;
      min-width: 0;
      font: inherit;
      font-size: 0.875rem;
      font-weight: 700;
      background: rgba(255, 255, 255, 0.6);
      border: 1px solid rgba(0, 0, 0, 0.2);
      border-radius: 4px;
      padding: 0.1rem 0.3rem;
      outline: none;
      color: inherit;
    }

    .title-bar__btn {
      width: 1.5rem;
      height: 1.5rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      font-size: 0.7rem;
      line-height: 1;
      padding: 0;
      background: rgba(255, 255, 255, 0.5);
      border: 1px solid rgba(0, 0, 0, 0.15);
      cursor: pointer;
      color: inherit;
      flex-shrink: 0;
      transition: opacity 0.12s, background 0.12s;
    }

    .title-bar__btn:hover {
      opacity: 0.8;
      background: rgba(255, 255, 255, 0.75);
    }

    .title-bar__btn--close:hover {
      background: rgba(180, 0, 20, 0.15);
      color: #b00020;
      border-color: rgba(180, 0, 20, 0.3);
    }
  `],
})
export class WidgetTitleBarComponent {
  @Input({ required: true }) title!: string;
  @Input() minimized = false;

  @Output() minimizeToggled = new EventEmitter<void>();
  @Output() closeClicked = new EventEmitter<void>();
  @Output() titleChanged = new EventEmitter<string>();

  @ViewChild('titleInput') titleInputRef?: ElementRef<HTMLInputElement>;

  protected editing = signal(false);
  protected draft = '';

  private commitPending = false;

  protected startEdit(): void {
    this.draft = this.title;
    this.editing.set(true);
    setTimeout(() => this.titleInputRef?.nativeElement?.select());
  }

  protected commitEdit(): void {
    const trimmed = this.draft.trim();
    this.commitPending = true;
    this.editing.set(false);
    if (trimmed && trimmed !== this.title) {
      this.titleChanged.emit(trimmed);
    }
    this.commitPending = false;
  }

  protected cancelEdit(): void {
    this.commitPending = true;
    this.editing.set(false);
    this.commitPending = false;
  }

  protected onBlur(): void {
    if (!this.commitPending) {
      setTimeout(() => {
        if (this.editing()) {
          this.commitEdit();
        }
      }, 150);
    }
  }
}
