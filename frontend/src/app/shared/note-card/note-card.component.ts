import { Component, Input, Output, EventEmitter, OnChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Note, Quote } from '../../core/models/task.models';
import { NoteApiService, UpdateNoteRequest } from '../../core/services/note-api.service';
import { QuoteApiService } from '../../core/services/quote-api.service';
import { ColorPickerComponent } from '../color-picker/color-picker.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { WidgetTitleBarComponent } from '../widget-title-bar/widget-title-bar.component';
import { autoContrastColor, isGradient, firstHexFromGradient } from '../color-picker/color-utils';

@Component({
  selector: 'app-note-card',
  standalone: true,
  imports: [CommonModule, FormsModule, ColorPickerComponent, ConfirmDialogComponent, WidgetTitleBarComponent],
  host: { '[class.note-card--elevated]': 'colorPickerOpen || confirmingDelete' },
  template: `
    <article class="note-card" [style.background]="note.color"
             [style.color]="textColor()" (click)="$event.stopPropagation()">

      <!-- Title bar -->
      <app-widget-title-bar
        [title]="note.title"
        [minimized]="minimized"
        (titleChanged)="onTitleChanged($event)"
        (closeClicked)="requestDelete()"
        (minimizeToggled)="minimized = !minimized"
      ></app-widget-title-bar>

      <!-- Body (hidden when minimized) -->
      <ng-container *ngIf="!minimized">
        <!-- Body actions -->
        <div class="note-card__body-actions">
          <!-- Font size toggle (regular notes only) -->
          <button *ngIf="!isQuote()" type="button" class="icon-btn" (click)="cycleFontSize()" [title]="'Font size: ' + (note.fontSize || 'medium')" aria-label="Font size">
            <span aria-hidden="true">{{ fontSizeIcon() }}</span>
          </button>
          <!-- Color picker -->
          <button type="button" class="icon-btn" (click)="toggleColorPicker()" title="Note color" aria-label="Change note color">
            <span aria-hidden="true">🌈</span>
          </button>
        </div>

        <!-- Color picker panel -->
        <div class="color-picker-panel" *ngIf="colorPickerOpen" (click)="$event.stopPropagation()">
          <app-color-picker
            [selectedColor]="note.color"
            [selectedTextColor]="note.textColor ?? null"
            (colorChange)="onColorChange($event)"
            (textColorChange)="onTextColorChange($event)"
          ></app-color-picker>
          <button type="button" class="done-btn" (click)="saveColor()">Done</button>
        </div>

        <!-- Note content textarea (regular notes) -->
        <textarea *ngIf="!isQuote()"
          class="note-content"
          [class.note-content--small]="note.fontSize === 'small'"
          [class.note-content--large]="note.fontSize === 'large'"
          [style.color]="textColor()"
          [(ngModel)]="contentDraft"
          (blur)="saveContent()"
          placeholder="Type a note…"
          rows="5"
        ></textarea>

      <!-- Quote content (read-only) -->
      <ng-container *ngIf="isQuote()">
        <div *ngIf="quoteLoading" class="note-content note-content--quote-loading">Loading quote…</div>
        <div *ngIf="!quoteLoading && quoteError" class="note-content note-content--quote-error">{{ quoteError }}</div>
        <blockquote *ngIf="!quoteLoading && todayQuote" class="note-content note-content--quote"
                    [class.note-content--small]="note.fontSize === 'small'"
                    [class.note-content--large]="note.fontSize === 'large'"
                    [style.color]="textColor()">
          <p class="quote-text">"{{ todayQuote.quoteText }}"</p>
          <footer *ngIf="todayQuote.attribution" class="quote-attribution">— {{ todayQuote.attribution }}</footer>
        </blockquote>
      </ng-container>
      </ng-container><!-- end !minimized -->

      <!-- Confirm delete dialog -->
      <app-confirm-dialog
        *ngIf="confirmingDelete"
        [itemName]="note.title"
        (confirmed)="onConfirmDelete()"
        (cancelled)="confirmingDelete = false"
      ></app-confirm-dialog>
    </article>
  `,
  styles: [`
    :host {
      display: block;
      position: relative;
      z-index: 1;
    }
    :host.note-card--elevated { z-index: 20; }

    .note-card {
      border-radius: 12px;
      padding: 0;
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 24px rgba(0,0,0,0.22), 0 2px 6px rgba(0,0,0,0.12);
      border: 1px solid rgba(255,255,255,0.5);
      position: relative;
      overflow: hidden;
    }

    app-widget-title-bar {
      flex-shrink: 0;
    }

    .note-card__body-actions {
      display: flex;
      gap: 0.3rem;
      align-items: center;
      padding: 0.4rem 0.75rem 0;
    }

    .icon-btn {
      width: 1.8rem;
      height: 1.8rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      font-size: 0.95rem;
      line-height: 1;
      padding: 0;
      background: rgba(255,255,255,0.7);
      border: 1px solid rgba(45,26,16,0.2);
      cursor: pointer;
      color: inherit;
      transition: opacity 0.12s;
    }
    .icon-btn:hover { opacity: 0.75; }

    .color-picker-panel {
      background: #fffef8;
      border-radius: 10px;
      border: 1px solid rgba(45,26,16,0.12);
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
      padding: 0.5rem;
      margin: 0 0.75rem;
    }
    .done-btn {
      margin-top: 0.5rem;
      border: 1px dashed rgba(45,26,16,0.2);
      border-radius: 6px;
      padding: 0.3rem 0.6rem;
      background: rgba(255,255,255,0.5);
      color: inherit;
      font: inherit;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      width: 100%;
    }

    .note-content {
      resize: vertical;
      border: none;
      background: transparent;
      color: inherit;
      font: inherit;
      font-size: var(--locker-body-font-size, 0.9rem);
      line-height: 1.55;
      width: 100%;
      box-sizing: border-box;
      padding: 0.5rem 0.75rem 0.75rem;
      outline: none;
    }
    .note-content::placeholder { color: rgba(0,0,0,0.35); }
    .note-content--small { font-size: 0.75rem; }
    .note-content--large { font-size: 1.05rem; }

    .note-content--quote {
      resize: none;
      padding: 0.4rem 0.1rem;
      margin: 0;
    }
    .note-content--quote-loading,
    .note-content--quote-error {
      font-size: 0.85rem;
      font-style: italic;
      opacity: 0.7;
      padding: 0.25rem 0.1rem;
    }

    .note-card__quote-icon {
      margin-right: 0.25rem;
      font-style: normal;
    }

    blockquote.note-content--quote {
      border: none;
      background: transparent;
      color: inherit;
      font: inherit;
    }
    .quote-text {
      font-size: 0.9rem;
      line-height: 1.55;
      font-style: italic;
      margin: 0 0 0.4rem;
    }
    .note-content--small .quote-text { font-size: 0.75rem; }
    .note-content--large .quote-text { font-size: 1.05rem; }
    .quote-attribution {
      font-size: 0.8rem;
      font-style: normal;
      font-weight: 600;
      opacity: 0.75;
      text-align: right;
      margin: 0;
    }
  `]
})
export class NoteCardComponent implements OnChanges, OnInit {
  @Input({ required: true }) note!: Note;
  @Output() noteUpdated = new EventEmitter<Note>();
  @Output() noteDeleted = new EventEmitter<string>();

  protected minimized = false;
  protected contentDraft = '';
  protected colorPickerOpen = false;
  protected confirmingDelete = false;
  protected todayQuote: Quote | null = null;
  protected quoteLoading = false;
  protected quoteError: string | null = null;
  private colorDraft = '';
  private textColorDraft: string | null = null;

  constructor(
    private readonly noteApi: NoteApiService,
    private readonly quoteApi: QuoteApiService,
  ) {}

  ngOnInit(): void {
    if (this.isQuote()) {
      this.loadTodayQuote();
    }
  }

  ngOnChanges(): void {
    this.contentDraft = this.note.content ?? '';
    this.colorDraft = this.note.color;
    this.textColorDraft = this.note.textColor ?? null;
  }

  protected isQuote(): boolean {
    return this.note.noteType === 'QUOTE';
  }

  private loadTodayQuote(): void {
    this.quoteLoading = true;
    this.quoteError = null;
    this.quoteApi.getTodayQuote().subscribe({
      next: (quote) => {
        this.todayQuote = quote;
        this.quoteLoading = false;
      },
      error: () => {
        this.quoteError = 'No quote available today.';
        this.quoteLoading = false;
      },
    });
  }

  protected textColor(): string {
    if (this.note.textColor) return this.note.textColor;
    const bg = this.note.color || '#fef3c7';
    if (isGradient(bg)) {
      const first = firstHexFromGradient(bg);
      return first ? autoContrastColor(first) : '#000000';
    }
    return autoContrastColor(bg);
  }

  protected fontSizeIcon(): string {
    switch (this.note.fontSize) {
      case 'small': return 'A';
      case 'large': return 'A';
      default: return 'A';
    }
  }

  protected cycleFontSize(): void {
    const sizes = ['medium', 'small', 'large'];
    const current = this.note.fontSize || 'medium';
    const next = sizes[(sizes.indexOf(current) + 1) % sizes.length];
    this.saveUpdate({ fontSize: next === 'medium' ? null : next });
  }

  protected onTitleChanged(title: string): void {
    this.saveUpdate({ title });
  }

  protected saveContent(): void {
    if (this.contentDraft === (this.note.content ?? '')) return;
    this.saveUpdate({ content: this.contentDraft });
  }

  protected toggleColorPicker(): void {
    this.colorPickerOpen = !this.colorPickerOpen;
    this.colorDraft = this.note.color;
    this.textColorDraft = this.note.textColor ?? null;
  }

  protected onColorChange(color: string): void {
    this.colorDraft = color;
    // Optimistic preview
    this.noteUpdated.emit({ ...this.note, color });
  }

  protected onTextColorChange(textColor: string | null): void {
    this.textColorDraft = textColor;
    this.noteUpdated.emit({ ...this.note, textColor });
  }

  protected saveColor(): void {
    this.colorPickerOpen = false;
    this.saveUpdate({ color: this.colorDraft, textColor: this.textColorDraft });
  }

  protected requestDelete(): void {
    this.confirmingDelete = true;
  }

  protected onConfirmDelete(): void {
    this.noteApi.deleteNote(this.note.id).subscribe({
      next: () => this.noteDeleted.emit(this.note.id),
    });
    this.confirmingDelete = false;
  }

  private saveUpdate(partial: Partial<UpdateNoteRequest>): void {
    const req: UpdateNoteRequest = {
      title: this.note.title,
      content: this.note.content ?? null,
      color: this.note.color,
      textColor: this.note.textColor ?? null,
      fontSize: this.note.fontSize ?? null,
      ...partial,
    };
    this.noteApi.updateNote(this.note.id, req).subscribe({
      next: updated => this.noteUpdated.emit(updated),
    });
  }
}
