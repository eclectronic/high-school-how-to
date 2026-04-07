import {
  Component, Input, Output, EventEmitter, signal, computed, OnChanges, SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as chrono from 'chrono-node';

@Component({
  selector: 'app-due-date-popover',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="popover" (click)="$event.stopPropagation()">
      <h4 class="popover__title">Set due date</h4>

      <!-- Natural language input -->
      <div class="input-group">
        <label class="input-label">Natural language</label>
        <input type="text" class="text-input" [(ngModel)]="naturalText"
               (input)="onNaturalTextChange()"
               (keydown.enter)="onTextEnter()"
               (keydown.escape)="onTextEscape()"
               placeholder="e.g. tomorrow at 3pm, next Tuesday…" />
        @if (parsedPreview()) {
          <span class="preview">{{ parsedPreview() }}</span>
        } @else if (naturalText && !parsedPreview()) {
          <span class="preview preview--error">Couldn't parse that date</span>
        }
      </div>

      <!-- Date/time picker -->
      <div class="input-group">
        <label class="input-label">Date and time</label>
        <input type="datetime-local" class="datetime-input" [(ngModel)]="pickerValue"
               (change)="onPickerChange()" />
      </div>

      <!-- Actions -->
      <div class="popover__actions">
        <button type="button" class="btn btn--clear" (click)="clear()">Clear</button>
        <button type="button" class="btn btn--apply" (click)="apply()" [disabled]="!canApply()">Apply</button>
      </div>
    </div>
  `,
  styles: [`
    .popover {
      background: #fffef8;
      border-radius: 0.75rem;
      padding: 1rem;
      box-shadow: 0 8px 24px rgba(45, 26, 16, 0.18);
      border: 1px solid rgba(45, 26, 16, 0.12);
      min-width: 280px;
      font-family: var(--font-body);
    }

    .popover__title {
      margin: 0 0 0.75rem;
      font-family: var(--font-display);
      font-size: 1rem;
      color: #2d1a10;
    }

    .input-group {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      margin-bottom: 0.75rem;
    }

    .input-label {
      font-size: 0.75rem;
      color: #5f4f43;
      font-weight: 600;
    }

    .text-input, .datetime-input {
      padding: 0.4rem 0.6rem;
      border: 1px solid rgba(45, 26, 16, 0.2);
      border-radius: 6px;
      font-family: var(--font-body);
      font-size: 0.85rem;
      background: #fff;
      color: #2d1a10;
      outline: none;
      width: 100%;
      box-sizing: border-box;

      &:focus { border-color: #2d1a10; }
    }

    .preview {
      font-size: 0.78rem;
      color: #5f4f43;
      padding: 0.2rem 0.4rem;
      background: #f0ebe3;
      border-radius: 4px;
      font-style: italic;

      &--error { color: #c53030; background: #fff5f5; }
    }

    .popover__actions {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
      margin-top: 0.25rem;
    }

    .btn {
      padding: 0.35rem 0.9rem;
      border-radius: 6px;
      font-family: var(--font-body);
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: opacity 0.15s;

      &:hover:not(:disabled) { opacity: 0.8; }
      &:disabled { opacity: 0.4; cursor: not-allowed; }
    }

    .btn--clear {
      background: #e8e0d4;
      color: #2d1a10;
    }

    .btn--apply {
      background: #2d1a10;
      color: #fff;
    }
  `]
})
export class DueDatePopoverComponent implements OnChanges {
  @Input() dueAt: string | null = null;
  @Output() dueAtChange = new EventEmitter<string | null>();

  protected naturalText = '';
  protected pickerValue = '';
  protected parsedDate = signal<Date | null>(null);

  protected parsedPreview = computed(() => {
    const d = this.parsedDate();
    if (!d) return null;
    return d.toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      year: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  });

  protected canApply = computed(() => {
    return this.parsedDate() !== null || this.pickerValue !== '';
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dueAt'] && this.dueAt) {
      const d = new Date(this.dueAt);
      if (!isNaN(d.getTime())) {
        this.pickerValue = this.toPickerValue(d);
        this.parsedDate.set(d);
      }
    }
  }

  onNaturalTextChange(): void {
    if (!this.naturalText.trim()) {
      this.parsedDate.set(null);
      return;
    }
    const result = chrono.parseDate(this.naturalText, new Date());
    if (result) {
      this.parsedDate.set(result);
      this.pickerValue = this.toPickerValue(result);
    } else {
      this.parsedDate.set(null);
    }
  }

  onPickerChange(): void {
    if (this.pickerValue) {
      const d = new Date(this.pickerValue);
      if (!isNaN(d.getTime())) {
        this.parsedDate.set(d);
        this.naturalText = '';
      }
    }
  }

  protected onTextEnter(): void {
    if (this.canApply()) this.apply();
  }

  protected onTextEscape(): void {
    this.clear();
  }

  apply(): void {
    const d = this.parsedDate();
    if (d) {
      this.dueAtChange.emit(d.toISOString());
    } else if (this.pickerValue) {
      const pd = new Date(this.pickerValue);
      if (!isNaN(pd.getTime())) {
        this.dueAtChange.emit(pd.toISOString());
      }
    }
  }

  clear(): void {
    this.naturalText = '';
    this.pickerValue = '';
    this.parsedDate.set(null);
    this.dueAtChange.emit(null);
  }

  private toPickerValue(d: Date): string {
    // Format for datetime-local input: YYYY-MM-DDTHH:mm
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}
