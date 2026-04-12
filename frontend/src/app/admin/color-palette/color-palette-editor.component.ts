import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColorPickerComponent } from '../../shared/color-picker/color-picker.component';
import { ColorPaletteApiService } from '../../core/services/color-palette-api.service';
import { DEFAULT_PALETTE } from '../../shared/color-picker/color-utils';

@Component({
  selector: 'app-color-palette-editor',
  standalone: true,
  imports: [CommonModule, ColorPickerComponent],
  template: `
    <div class="palette-editor">
      <h2 class="palette-editor__title">Color Palette</h2>
      <p class="palette-editor__desc">
        Configure the 16 swatches shown to users when they pick a card color.
      </p>

      @if (saveError()) {
        <div class="alert alert--error">{{ saveError() }}</div>
      }
      @if (saveSuccess()) {
        <div class="alert alert--success">Palette saved.</div>
      }

      <div class="swatch-grid">
        @for (color of palette(); track $index) {
          <div class="swatch-item" [class.swatch-item--active]="editingIndex() === $index">
            <button
              type="button"
              class="swatch-preview"
              [style.background]="color"
              [title]="color"
              (click)="toggleEdit($index)"
            ></button>
            <span class="swatch-hex">{{ color }}</span>
          </div>
        }
      </div>

      @if (editingIndex() !== null) {
        <div class="editor-panel">
          <h3 class="editor-panel__title">Edit Swatch {{ editingIndex()! + 1 }}</h3>
          <app-color-picker
            [selectedColor]="palette()[editingIndex()!]"
            (colorChange)="onColorChange($event)"
            (escaped)="editingIndex.set(null)"
          ></app-color-picker>
          <button type="button" class="btn btn--ghost" (click)="editingIndex.set(null)">Close</button>
        </div>
      }

      <div class="palette-editor__actions">
        <button type="button" class="btn btn--primary" [disabled]="saving()" (click)="save()">
          {{ saving() ? 'Saving…' : 'Save Palette' }}
        </button>
        <button type="button" class="btn btn--ghost" (click)="reset()">Reset to Default</button>
      </div>
    </div>
  `,
  styles: [`
    .palette-editor {
      max-width: 600px;
      padding: 1.5rem;
      font-family: var(--font-body, sans-serif);
    }

    .palette-editor__title { margin: 0 0 0.25rem; }
    .palette-editor__desc { color: #666; font-size: 0.9rem; margin: 0 0 1.25rem; }

    .alert {
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      margin-bottom: 1rem;
      font-size: 0.9rem;
    }
    .alert--error { background: #fee2e2; color: #991b1b; }
    .alert--success { background: #dcfce7; color: #166534; }

    .swatch-grid {
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      gap: 8px;
      margin-bottom: 1.5rem;
    }

    .swatch-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;

      &--active .swatch-preview {
        outline: 3px solid #2d1a10;
        outline-offset: 2px;
      }
    }

    .swatch-preview {
      width: 40px;
      height: 40px;
      border-radius: 6px;
      border: 1px solid rgba(0,0,0,0.12);
      cursor: pointer;
      transition: transform 0.1s;

      &:hover { transform: scale(1.1); }
    }

    .swatch-hex {
      font-family: monospace;
      font-size: 0.65rem;
      color: #666;
      text-align: center;
      width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .editor-panel {
      background: #fffef8;
      border: 1px solid rgba(45,26,16,0.12);
      border-radius: 10px;
      padding: 1rem;
      margin-bottom: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-width: 300px;
    }

    .editor-panel__title { margin: 0; font-size: 0.95rem; }

    .palette-editor__actions {
      display: flex;
      gap: 0.75rem;
    }

    .btn {
      padding: 0.45rem 1rem;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      font-size: 0.9rem;
      font-family: inherit;
      font-weight: 600;

      &--primary { background: #2d1a10; color: #fff; }
      &--primary:disabled { opacity: 0.5; cursor: default; }
      &--ghost { background: transparent; border: 1px solid rgba(45,26,16,0.25); color: #2d1a10; }
    }
  `],
})
export class ColorPaletteEditorComponent implements OnInit {
  protected palette = signal<string[]>([...DEFAULT_PALETTE]);
  protected editingIndex = signal<number | null>(null);
  protected saving = signal(false);
  protected saveError = signal<string | null>(null);
  protected saveSuccess = signal(false);

  constructor(private readonly paletteApi: ColorPaletteApiService) {}

  ngOnInit(): void {
    this.paletteApi.getPalette().subscribe({
      next: colors => this.palette.set([...colors]),
    });
  }

  protected toggleEdit(index: number): void {
    this.editingIndex.set(this.editingIndex() === index ? null : index);
  }

  protected onColorChange(color: string): void {
    const idx = this.editingIndex();
    if (idx === null) return;
    const updated = [...this.palette()];
    updated[idx] = color;
    this.palette.set(updated);
  }

  protected save(): void {
    this.saving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);
    this.paletteApi.adminReplacePalette(this.palette()).subscribe({
      next: () => {
        this.saving.set(false);
        this.saveSuccess.set(true);
        setTimeout(() => this.saveSuccess.set(false), 3000);
      },
      error: () => {
        this.saving.set(false);
        this.saveError.set('Failed to save palette. Please try again.');
      },
    });
  }

  protected reset(): void {
    this.palette.set([...DEFAULT_PALETTE]);
    this.editingIndex.set(null);
  }
}
