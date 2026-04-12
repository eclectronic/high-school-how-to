import { Component, HostListener, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dialog-backdrop" (click)="onCancel()">
      <div class="dialog" (click)="$event.stopPropagation()" role="dialog" [attr.aria-label]="'Delete ' + itemName">
        <p class="dialog__message">{{ message || ("Delete " + itemName + "? This can't be undone.") }}</p>
        <div class="dialog__actions">
          <button type="button" class="btn btn--cancel" (click)="onCancel()">Cancel</button>
          <button type="button" class="btn btn--delete" (click)="onConfirm()">Delete</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dialog-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .dialog {
      background: #fffef8;
      border-radius: 1rem;
      padding: 1.5rem 2rem;
      max-width: 360px;
      width: 90%;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.2);
    }

    .dialog__message {
      font-family: var(--font-body);
      font-size: 1rem;
      color: #2d1a10;
      margin: 0 0 1.5rem;
      line-height: 1.5;
    }

    .dialog__actions {
      display: flex;
      gap: 0.75rem;
      justify-content: flex-end;
    }

    .btn {
      padding: 0.5rem 1.25rem;
      border-radius: 8px;
      font-family: var(--font-body);
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: opacity 0.15s;

      &:hover { opacity: 0.85; }
    }

    .btn--cancel {
      background: #e8e0d4;
      color: #2d1a10;
    }

    .btn--delete {
      background: #e53e3e;
      color: #fff;
    }
  `]
})
export class ConfirmDialogComponent {
  @Input() itemName = '';
  @Input() message?: string;
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') { event.preventDefault(); this.onConfirm(); }
    if (event.key === 'Escape') { this.onCancel(); }
  }

  onConfirm(): void {
    this.confirmed.emit();
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
