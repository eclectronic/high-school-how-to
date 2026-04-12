import { AfterViewInit, Component, ElementRef, Input, Output, EventEmitter, OnChanges, OnInit, OnDestroy, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Note, Quote } from '../../core/models/task.models';
import { NoteApiService, UpdateNoteRequest } from '../../core/services/note-api.service';
import { QuoteApiService } from '../../core/services/quote-api.service';
import { SwatchPickerComponent } from '../swatch-picker/swatch-picker.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { WidgetTitleBarComponent } from '../widget-title-bar/widget-title-bar.component';
import { autoContrastColor, isGradient, firstHexFromGradient } from '../color-picker/color-utils';

@Component({
  selector: 'app-note-card',
  standalone: true,
  imports: [CommonModule, FormsModule, SwatchPickerComponent, ConfirmDialogComponent, WidgetTitleBarComponent],
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
        (minimizeToggled)="minimizeToggled.emit()"
      >
        <button type="button" class="title-bar-icon-btn" (click)="toggleColorPicker()" title="Note color" aria-label="Change note color">🌈</button>
      </app-widget-title-bar>

      <!-- Body (hidden when minimized) -->
      <ng-container *ngIf="!minimized">

        <!-- Color picker panel -->
        <div class="color-picker-panel" *ngIf="colorPickerOpen" (click)="$event.stopPropagation()" (keydown.enter)="saveColor()">
          <app-swatch-picker
            [selectedColor]="note.color"
            (colorChange)="onColorChange($event)"
            (colorCommit)="onColorCommit($event)"
            (escaped)="cancelColor()"
          ></app-swatch-picker>
          <div class="color-picker-actions">
            <button type="button" class="action-btn action-btn--cancel" (click)="cancelColor()">Cancel</button>
            <button type="button" class="action-btn action-btn--save" (click)="saveColor()">Save</button>
          </div>
        </div>

        <!-- Note content textarea (regular notes) -->
        <textarea *ngIf="!isQuote()"
          #textareaEl
          class="note-content"
          [style.color]="textColor()"
          [(ngModel)]="contentDraft"
          (input)="onTextInput()"
          (paste)="onPaste($any($event))"
          (blur)="saveContent()"
          placeholder="Type a note…"
        ></textarea>

      <!-- Quote content (read-only) -->
      <ng-container *ngIf="isQuote()">
        <div *ngIf="quoteLoading" class="note-content note-content--quote-loading">Loading quote…</div>
        <div *ngIf="!quoteLoading && quoteError" class="note-content note-content--quote-error">{{ quoteError }}</div>
        <blockquote *ngIf="!quoteLoading && todayQuote" class="note-content note-content--quote"
                    [style.font-size.px]="fontSize()"
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
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      position: relative;
      z-index: 1;
    }
    :host.note-card--elevated { z-index: 20; }

    .note-card {
      border-radius: 12px;
      padding: 0;
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      box-shadow: 0 8px 24px rgba(0,0,0,0.22), 0 2px 6px rgba(0,0,0,0.12);
      border: 1px solid rgba(255,255,255,0.5);
      position: relative;
      overflow: hidden;
    }

    app-widget-title-bar {
      flex-shrink: 0;
    }

    .title-bar-icon-btn {
      width: 1.5em;
      height: 1.5em;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      font-size: 0.85em;
      line-height: 1;
      padding: 0;
      background: rgba(255,255,255,0.5);
      border: 1px solid rgba(0,0,0,0.15);
      cursor: pointer;
      color: inherit;
      flex-shrink: 0;
      transition: opacity 0.12s, background 0.12s;
      &:hover { opacity: 0.8; background: rgba(255,255,255,0.75); }
    }

    .color-picker-panel {
      background: #fffef8;
      border-radius: 10px;
      border: 1px solid rgba(45,26,16,0.12);
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
      padding: 0.5rem;
      margin: 0 0.75rem;
    }
    .color-picker-actions {
      display: flex;
      gap: 0.4rem;
      margin-top: 0.5rem;
    }
    .action-btn {
      flex: 1;
      border-radius: 6px;
      padding: 0.3rem 0.6rem;
      font: inherit;
      font-size: 0.8em;
      font-weight: 700;
      cursor: pointer;
      border: 1px solid rgba(45,26,16,0.2);
      &--cancel { background: rgba(255,255,255,0.5); color: inherit; }
      &--save { background: rgba(45,26,16,0.15); color: inherit; }
    }

    .note-content {
      resize: none;
      border: none;
      background: transparent;
      color: inherit;
      font: inherit;
      line-height: 1.55;
      width: 100%;
      flex: 1;
      box-sizing: border-box;
      padding: 0.5rem 0.75rem 0.75rem;
      outline: none;
      min-height: 0;
    }
    textarea.note-content {
      font-size: 24px; /* initial size — adjustFontSize() takes over immediately after render */
      overflow-y: hidden; /* managed imperatively; switches to auto at minimum font size */
    }
    .note-content::placeholder { color: rgba(0,0,0,0.35); }

    .note-content--quote {
      padding: 0.4rem 0.75rem 0.75rem;
      margin: 0;
      overflow-y: auto;
    }
    .note-content--quote-loading,
    .note-content--quote-error {
      font-size: 0.85em;
      font-style: italic;
      opacity: 0.7;
      padding: 0.25rem 0.75rem;
    }

    blockquote.note-content--quote {
      border: none;
      background: transparent;
      color: inherit;
      font: inherit;
      text-align: left;
    }
    .quote-text {
      line-height: 1.55;
      font-style: italic;
      margin: 0 0 0.4rem;
      text-align: left;
    }
    .quote-attribution {
      font-size: 0.8em;
      font-style: normal;
      font-weight: 600;
      opacity: 0.75;
      text-align: left;
      margin: 0;
    }
  `]
})
export class NoteCardComponent implements OnChanges, OnInit, AfterViewInit, OnDestroy {
  @Input({ required: true }) note!: Note;
  @Input() minimized = false;
  @Output() noteUpdated = new EventEmitter<Note>();
  @Output() noteDeleted = new EventEmitter<string>();
  @Output() minimizeToggled = new EventEmitter<void>();

  readonly MIN_FONT_PX = 12;
  /** Max font for quotes (width-driven). Notes start at 24px via CSS, adjustFontSize handles them. */
  private readonly QUOTE_MAX_FONT_PX = 22;

  @ViewChild('textareaEl') private textareaEl?: ElementRef<HTMLTextAreaElement>;

  protected contentDraft = '';
  protected colorPickerOpen = false;
  protected confirmingDelete = false;
  protected todayQuote: Quote | null = null;
  protected quoteLoading = false;
  protected quoteError: string | null = null;
  /** Used only for quote font sizing (width-driven via ResizeObserver). */
  protected fontSize = signal(14);
  private colorDraft = '';
  private colorAtOpen = '';
  private resizeObserver = new ResizeObserver(([entry]) => {
    if (this.isQuote()) {
      // Quote: scale font with card width.
      const w = entry.contentRect.width;
      this.fontSize.set(Math.min(this.QUOTE_MAX_FONT_PX, Math.max(this.MIN_FONT_PX, Math.round(w * 0.065))));
    } else {
      // Regular note: re-fit font to content whenever the card is resized.
      this.adjustFontSize();
    }
  });

  constructor(
    private readonly noteApi: NoteApiService,
    private readonly quoteApi: QuoteApiService,
    private readonly hostEl: ElementRef<HTMLElement>,
  ) {}

  ngOnInit(): void {
    this.resizeObserver.observe(this.hostEl.nativeElement);
    if (this.isQuote()) {
      this.loadTodayQuote();
    }
  }

  ngAfterViewInit(): void {
    // Run after the first render so the textarea has its value and its
    // clientHeight is determined by the flex layout.
    setTimeout(() => this.adjustFontSize());
  }

  ngOnDestroy(): void {
    this.resizeObserver.disconnect();
  }

  ngOnChanges(): void {
    this.contentDraft = this.note.content ?? '';
    this.colorDraft = this.note.color;
    // Re-fit whenever the note content is updated from outside (e.g. initial load).
    setTimeout(() => this.adjustFontSize());
  }

  protected onTextInput(): void {
    this.adjustFontSize();
  }

  protected onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text') ?? '';
    const trimmed = text.trim();
    // Insert trimmed text at the cursor, replacing any selection.
    document.execCommand('insertText', false, trimmed);
    // Defer font sizing until after the browser has laid out the new content.
    setTimeout(() => this.adjustFontSize());
  }

  /**
   * Finds the largest font size (down to MIN_FONT_PX) that makes the textarea
   * content fit without scrolling, then enables overflow-y:auto if still
   * overflowing at the minimum. Reading scrollHeight forces a synchronous
   * browser reflow so the loop is accurate but does not cause visible flicker
   * (JS runs to completion before the browser paints).
   */
  private adjustFontSize(): void {
    const el = this.textareaEl?.nativeElement;
    if (!el) return;

    // Hide overflow during measurement so scrollHeight reflects full content height.
    el.style.overflowY = 'hidden';

    let size = 24; // start from maximum
    el.style.fontSize = size + 'px';

    // Shrink until content fits or minimum is reached.
    while (size > this.MIN_FONT_PX && el.scrollHeight > el.clientHeight) {
      size--;
      el.style.fontSize = size + 'px';
    }

    // Still overflowing at minimum → let the user scroll.
    el.style.overflowY = el.scrollHeight > el.clientHeight ? 'auto' : 'hidden';
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
    this.colorAtOpen = this.note.color;
  }

  protected onColorChange(color: string): void {
    this.colorDraft = color;
    // Optimistic preview
    this.noteUpdated.emit({ ...this.note, color });
  }

  protected onColorCommit(color: string): void {
    this.colorDraft = color;
    this.noteUpdated.emit({ ...this.note, color });
    this.saveColor();
  }

  protected saveColor(): void {
    this.colorPickerOpen = false;
    this.saveUpdate({ color: this.colorDraft, textColor: null });
  }

  protected cancelColor(): void {
    this.colorPickerOpen = false;
    if (this.colorDraft !== this.colorAtOpen) {
      this.noteUpdated.emit({ ...this.note, color: this.colorAtOpen });
    }
  }

  protected requestDelete(): void {
    if (!this.note.content?.trim()) {
      this.noteApi.deleteNote(this.note.id).subscribe({
        next: () => this.noteDeleted.emit(this.note.id),
      });
      return;
    }
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
