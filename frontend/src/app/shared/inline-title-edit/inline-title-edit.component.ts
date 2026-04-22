import { Component, Input, Output, EventEmitter, signal, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-inline-title-edit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (!editing()) {
      <span class="title-display" (click)="startEdit()" title="Click to rename" role="button" tabindex="0"
            (keydown.enter)="startEdit()" (keydown.space)="startEdit()">
        {{ title }}
        <span class="title-edit-hint" aria-hidden="true">✏</span>
      </span>
    } @else {
      <span class="title-edit">
        <input #titleInput class="title-input" [class.title-input--error]="hasError()"
               [(ngModel)]="draft" (keydown.enter)="commitAndAdvance()" (keydown.tab)="onTab($event)" (keydown.escape)="cancel()"
               (blur)="onBlur()" [placeholder]="placeholder || 'Enter a title'" />
        <button type="button" class="title-commit-btn" (click)="commit()" title="Save" [attr.aria-label]="'Save title'">✓</button>
      </span>
    }
  `,
  styles: [`
    :host { display: inline-block; }

    .title-display {
      cursor: pointer;

      .title-edit-hint {
        font-size: 0.7em;
        opacity: 0;
        margin-left: 0.3em;
        transition: opacity 0.15s;
      }

      &:hover .title-edit-hint { opacity: 0.5; }
    }

    .title-edit {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }

    .title-input {
      font: inherit;
      border: none;
      border-bottom: 2px solid #2d1a10;
      background: transparent;
      padding: 0.1rem 0.25rem;
      outline: none;
      min-width: 80px;
      max-width: 200px;

      &.title-input--error {
        border-color: #e53e3e;
      }
    }

    .title-commit-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 0.9rem;
      color: #2d1a10;
      padding: 0.1rem 0.25rem;
      opacity: 0.7;
      transition: opacity 0.15s;

      &:hover { opacity: 1; }
    }
  `]
})
export class InlineTitleEditComponent implements AfterViewInit {
  @Input() title = '';
  @Input() placeholder?: string;
  @Output() titleChange = new EventEmitter<string>();

  @Output() advanceFocus = new EventEmitter<void>();

  @ViewChild('titleInput') titleInputRef?: ElementRef<HTMLInputElement>;

  protected editing = signal(false);
  protected draft = '';
  protected hasError = signal(false);

  private commitPending = false;

  ngAfterViewInit(): void {
    if (this.editing()) {
      this.focusInput();
    }
  }

  startEdit(): void {
    this.draft = this.title;
    this.hasError.set(false);
    this.editing.set(true);
    // Focus on next tick after view updates
    setTimeout(() => this.focusInput());
  }

  commitAndAdvance(): void {
    this.commit();
    this.advanceFocus.emit();
  }

  protected onTab(event: Event): void {
    event.preventDefault();
    this.commitAndAdvance();
  }

  commit(): void {
    const trimmed = this.draft.trim();
    if (!trimmed) {
      this.hasError.set(true);
      return;
    }
    this.commitPending = true;
    this.editing.set(false);
    this.hasError.set(false);
    if (trimmed !== this.title) {
      this.titleChange.emit(trimmed);
    }
    this.commitPending = false;
  }

  cancel(): void {
    this.commitPending = true;
    this.editing.set(false);
    this.hasError.set(false);
    this.commitPending = false;
  }

  onBlur(): void {
    // Give the commit button click time to register before treating blur as cancel
    if (!this.commitPending) {
      setTimeout(() => {
        if (this.editing()) {
          this.cancel();
        }
      }, 150);
    }
  }

  private focusInput(): void {
    this.titleInputRef?.nativeElement?.select();
  }
}
