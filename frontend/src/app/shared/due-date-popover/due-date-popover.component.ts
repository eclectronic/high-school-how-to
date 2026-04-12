import {
  Component, HostListener, Input, OnInit, Output, EventEmitter, OnChanges, SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-due-date-popover',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="popover" (click)="$event.stopPropagation()">
      <h4 class="popover__title">Set due date</h4>
      <input type="datetime-local" class="datetime-input" [(ngModel)]="pickerValue" />
      <div class="popover__actions">
        <button type="button" class="btn btn--clear" (click)="clear()">Clear</button>
        <button type="button" class="btn btn--cancel" (click)="cancelled.emit()">Cancel</button>
        <button type="button" class="btn btn--save" (click)="apply()" [disabled]="!pickerValue">Save</button>
      </div>
    </div>
  `,
  styles: [`
    .popover {
      background: #fffef8;
      border-radius: 0.75rem;
      padding: 0.75rem;
      box-shadow: 0 8px 24px rgba(45, 26, 16, 0.18);
      border: 1px solid rgba(45, 26, 16, 0.12);
      min-width: 260px;
      font-family: var(--locker-font, var(--font-body));
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .popover__title {
      margin: 0;
      font-family: var(--locker-font, var(--font-body));
      font-size: 0.85rem;
      font-weight: 700;
      color: #2d1a10;
    }

    .datetime-input {
      padding: 0.4rem 0.6rem;
      border: 1px solid rgba(45, 26, 16, 0.2);
      border-radius: 6px;
      font-family: var(--locker-font, var(--font-body));
      font-size: 0.85rem;
      background: #fff;
      color: #2d1a10;
      outline: none;
      width: 100%;
      box-sizing: border-box;

      &:focus { border-color: #2d1a10; }
    }

    .popover__actions {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
    }

    .btn {
      padding: 0.35rem 0.9rem;
      border-radius: 6px;
      font-family: var(--locker-font, var(--font-body));
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: opacity 0.15s;

      &:hover:not(:disabled) { opacity: 0.8; }
      &:disabled { opacity: 0.4; cursor: not-allowed; }
    }

    .btn--clear  { background: #e8e0d4; color: #2d1a10; margin-right: auto; }
    .btn--cancel { background: #e8e0d4; color: #2d1a10; }
    .btn--save   { background: #2d1a10; color: #fff; }
  `]
})
export class DueDatePopoverComponent implements OnInit, OnChanges {
  @Input() dueAt: string | null = null;
  @Output() dueAtChange = new EventEmitter<string | null>();
  @Output() cancelled = new EventEmitter<void>();

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') { event.preventDefault(); this.apply(); }
    if (event.key === 'Escape') { this.cancelled.emit(); }
  }

  protected pickerValue = '';

  ngOnInit(): void {
    if (!this.pickerValue) {
      this.pickerValue = this.toPickerValue(new Date());
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dueAt'] && this.dueAt) {
      const d = new Date(this.dueAt);
      if (!isNaN(d.getTime())) {
        this.pickerValue = this.toPickerValue(d);
      }
    }
  }

  protected apply(): void {
    if (!this.pickerValue) return;
    const d = new Date(this.pickerValue);
    if (!isNaN(d.getTime())) {
      this.dueAtChange.emit(d.toISOString());
    }
  }

  protected clear(): void {
    this.pickerValue = '';
    this.dueAtChange.emit(null);
  }

  private toPickerValue(d: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}
