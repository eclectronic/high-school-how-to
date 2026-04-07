import {
  Component, Input, Output, EventEmitter, OnInit, signal, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DEFAULT_PALETTE, addToColorHistory, autoContrastColor, contrastRatio,
  isGradient, firstHexFromGradient, isHexColor,
  loadColorHistory, loadCustomPalette, saveColorHistory, saveCustomPalette
} from './color-utils';

type PickerMode = 'presets' | 'gradient' | 'freeform';
type GradientDirection = 'to bottom' | 'to right' | '135deg';

const GRADIENT_DIRECTIONS: { label: string; value: GradientDirection }[] = [
  { label: 'Top → Bottom', value: 'to bottom' },
  { label: 'Left → Right', value: 'to right' },
  { label: 'Diagonal', value: '135deg' },
];

@Component({
  selector: 'app-color-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="color-picker">
      <!-- Mode tabs -->
      <div class="picker-tabs" role="tablist">
        <button type="button" role="tab" [class.active]="mode() === 'presets'" (click)="setMode('presets')">Swatches</button>
        <button type="button" role="tab" [class.active]="mode() === 'gradient'" (click)="setMode('gradient')">Gradient</button>
        <button type="button" role="tab" [class.active]="mode() === 'freeform'" (click)="setMode('freeform')">Custom</button>
      </div>

      <!-- Preset swatches -->
      @if (mode() === 'presets') {
        <div class="swatch-grid" role="group" aria-label="Color palette">
          @for (color of palette(); track color; let i = $index) {
            <button type="button" class="swatch"
                    [style.background]="color"
                    [class.swatch--selected]="selectedColor === color"
                    [title]="color"
                    [attr.aria-label]="color"
                    (click)="selectPreset(color)"
                    (keydown.arrowRight)="focusSwatch(i + 1)"
                    (keydown.arrowLeft)="focusSwatch(i - 1)">
            </button>
          }
        </div>

        <!-- Save to palette (only when a non-preset color is staged) -->
        @if (stagedColor() && !palette().includes(stagedColor()!)) {
          <div class="save-to-palette">
            <span class="save-label">Save to palette cell:</span>
            <div class="swatch-grid swatch-grid--small">
              @for (color of palette(); track color; let i = $index) {
                <button type="button" class="swatch swatch--replace" [style.background]="color"
                        [title]="'Replace ' + color"
                        (click)="saveToPalette(i)">
                </button>
              }
            </div>
          </div>
        }

        <button type="button" class="btn-reset" (click)="resetPalette()">Reset to defaults</button>
      }

      <!-- Gradient builder -->
      @if (mode() === 'gradient') {
        <div class="gradient-builder">
          <div class="gradient-row">
            <label>Color 1</label>
            <input type="color" [(ngModel)]="gradientColor1" (change)="previewGradient()" />
          </div>
          <div class="gradient-row">
            <label>Color 2</label>
            <input type="color" [(ngModel)]="gradientColor2" (change)="previewGradient()" />
          </div>
          <div class="gradient-row">
            <label>Direction</label>
            <select [(ngModel)]="gradientDirection" (change)="previewGradient()">
              @for (dir of gradientDirections; track dir.value) {
                <option [value]="dir.value">{{ dir.label }}</option>
              }
            </select>
          </div>
          <div class="gradient-preview" [style.background]="gradientPreview()"></div>
          <button type="button" class="btn-apply" (click)="applyGradient()">Apply Gradient</button>
        </div>
      }

      <!-- Free-form picker -->
      @if (mode() === 'freeform') {
        <div class="freeform">
          <input type="color" [(ngModel)]="freeformColor" (change)="previewFreeform()" />
          <input type="text" [(ngModel)]="freeformColor" (input)="previewFreeform()"
                 placeholder="#rrggbb" maxlength="7" class="hex-input" />
          <button type="button" class="btn-apply" (click)="applyFreeform()">Apply</button>
        </div>
      }

      <!-- Color history -->
      @if (colorHistory().length > 0) {
        <div class="history-section">
          <span class="history-label">Recent:</span>
          <div class="swatch-row">
            @for (color of colorHistory(); track color) {
              <button type="button" class="swatch swatch--small"
                      [style.background]="color"
                      [class.swatch--selected]="selectedColor === color"
                      [title]="color"
                      (click)="selectFromHistory(color)">
              </button>
            }
          </div>
        </div>
      }

      <!-- Text color section -->
      <div class="text-color-section">
        <div class="text-color-header">
          <span class="text-color-label">Text color</span>
          <button type="button" class="btn-auto" [class.active]="!selectedTextColor"
                  (click)="clearTextColor()">Auto</button>
        </div>

        @if (selectedTextColor) {
          <div class="text-color-controls">
            <input type="color" [(ngModel)]="selectedTextColor" (change)="onTextColorChange()" />
            <input type="text" [(ngModel)]="selectedTextColor" (input)="onTextColorChange()"
                   placeholder="#rrggbb" maxlength="7" class="hex-input hex-input--small" />
            @if (lowContrast()) {
              <span class="low-contrast-badge">⚠ Low contrast</span>
            }
          </div>
        } @else {
          <span class="auto-label">Auto ({{ autoTextColor() }})</span>
        }
      </div>
    </div>
  `,
  styles: [`
    .color-picker {
      font-family: var(--font-body);
      font-size: 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .picker-tabs {
      display: flex;
      gap: 0.25rem;

      button {
        flex: 1;
        padding: 0.35rem 0.5rem;
        border: 1px solid rgba(45, 26, 16, 0.2);
        background: #f9eddc;
        color: #2d1a10;
        border-radius: 6px;
        cursor: pointer;
        font-family: var(--font-body);
        font-size: 0.8rem;
        transition: background 0.15s;

        &.active {
          background: #2d1a10;
          color: #fff;
          border-color: #2d1a10;
        }
      }
    }

    .swatch-grid {
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      gap: 4px;

      &--small { grid-template-columns: repeat(8, 1fr); }
    }

    .swatch {
      width: 28px;
      height: 28px;
      border-radius: 4px;
      border: 2px solid transparent;
      cursor: pointer;
      transition: transform 0.1s, border-color 0.1s;
      outline: none;

      &:hover { transform: scale(1.15); border-color: rgba(0,0,0,0.3); }
      &--selected { border-color: #2d1a10 !important; }
      &--small { width: 22px; height: 22px; }
      &--replace { opacity: 0.8; &:hover { opacity: 1; } }
    }

    .swatch-row {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .gradient-builder {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .gradient-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;

      label { min-width: 60px; color: #5f4f43; }

      input[type=color], select {
        cursor: pointer;
        border-radius: 4px;
        border: 1px solid rgba(45, 26, 16, 0.2);
        padding: 2px;
      }
    }

    .gradient-preview {
      height: 32px;
      border-radius: 6px;
      border: 1px solid rgba(45, 26, 16, 0.1);
    }

    .freeform {
      display: flex;
      align-items: center;
      gap: 0.5rem;

      input[type=color] { cursor: pointer; height: 32px; width: 40px; border-radius: 4px; border: none; }
    }

    .hex-input {
      width: 80px;
      padding: 0.25rem 0.4rem;
      border-radius: 4px;
      border: 1px solid rgba(45, 26, 16, 0.2);
      font-family: monospace;
      font-size: 0.8rem;

      &--small { width: 72px; }
    }

    .btn-apply, .btn-reset {
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      font-family: var(--font-body);
      font-size: 0.8rem;
      cursor: pointer;
      border: none;
      background: #2d1a10;
      color: #fff;
      align-self: flex-start;
      transition: opacity 0.15s;

      &:hover { opacity: 0.8; }
    }

    .btn-reset { background: #888; }

    .save-to-palette {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .save-label, .history-label, .text-color-label { color: #5f4f43; font-size: 0.8rem; }

    .history-section {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }

    .text-color-section {
      border-top: 1px solid rgba(45, 26, 16, 0.1);
      padding-top: 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .text-color-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-auto {
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-family: var(--font-body);
      font-size: 0.75rem;
      cursor: pointer;
      border: 1px solid rgba(45, 26, 16, 0.3);
      background: transparent;
      color: #5f4f43;
      transition: background 0.15s;

      &.active { background: #2d1a10; color: #fff; border-color: #2d1a10; }
    }

    .text-color-controls {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;

      input[type=color] { cursor: pointer; height: 28px; width: 36px; border-radius: 4px; border: none; }
    }

    .auto-label { color: #888; font-size: 0.8rem; font-family: monospace; }

    .low-contrast-badge {
      background: #fff3cd;
      color: #856404;
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }
  `]
})
export class ColorPickerComponent implements OnInit {
  @Input() selectedColor = '#fffef8';
  @Input() selectedTextColor: string | null = null;
  @Output() colorChange = new EventEmitter<string>();
  @Output() textColorChange = new EventEmitter<string | null>();

  protected mode = signal<PickerMode>('presets');
  protected palette = signal<string[]>([...DEFAULT_PALETTE]);
  protected colorHistory = signal<string[]>([]);
  protected stagedColor = signal<string | null>(null);

  protected gradientColor1 = '#6aabdf';
  protected gradientColor2 = '#2368b0';
  protected gradientDirection: GradientDirection = '135deg';
  protected gradientDirections = GRADIENT_DIRECTIONS;
  protected gradientPreview = signal<string>(this.buildGradient());

  protected freeformColor = '#fffef8';

  protected autoTextColor = computed(() => {
    if (isGradient(this.selectedColor)) {
      const first = firstHexFromGradient(this.selectedColor);
      return first ? autoContrastColor(first) : '#000000';
    }
    return isHexColor(this.selectedColor) ? autoContrastColor(this.selectedColor) : '#000000';
  });

  protected lowContrast = computed(() => {
    if (!this.selectedTextColor) return false;
    const bg = isGradient(this.selectedColor)
      ? firstHexFromGradient(this.selectedColor) ?? '#fffef8'
      : this.selectedColor;
    if (!isHexColor(bg) || !isHexColor(this.selectedTextColor)) return false;
    return contrastRatio(bg, this.selectedTextColor) < 4.5;
  });

  ngOnInit(): void {
    this.palette.set(loadCustomPalette());
    this.colorHistory.set(loadColorHistory());
  }

  setMode(m: PickerMode): void {
    this.mode.set(m);
  }

  selectPreset(color: string): void {
    this.selectedColor = color;
    this.stagedColor.set(color);
    this.emitColor(color);
  }

  selectFromHistory(color: string): void {
    this.selectedColor = color;
    this.stagedColor.set(color);
    this.emitColor(color);
  }

  focusSwatch(index: number): void {
    const swatches: NodeListOf<HTMLElement> = document.querySelectorAll('.swatch');
    const target = swatches[index];
    target?.focus();
  }

  previewGradient(): void {
    this.gradientPreview.set(this.buildGradient());
  }

  applyGradient(): void {
    const gradient = this.buildGradient();
    this.selectedColor = gradient;
    this.stagedColor.set(gradient);
    this.emitColor(gradient);
  }

  previewFreeform(): void {
    // Freeform is shown live via ngModel binding
  }

  applyFreeform(): void {
    const color = this.freeformColor;
    this.selectedColor = color;
    this.stagedColor.set(color);
    this.emitColor(color);
  }

  saveToPalette(index: number): void {
    const staged = this.stagedColor();
    if (!staged) return;
    const newPalette = [...this.palette()];
    newPalette[index] = staged;
    this.palette.set(newPalette);
    saveCustomPalette(newPalette);
  }

  resetPalette(): void {
    this.palette.set([...DEFAULT_PALETTE]);
    saveCustomPalette([...DEFAULT_PALETTE]);
  }

  onTextColorChange(): void {
    this.textColorChange.emit(this.selectedTextColor);
  }

  clearTextColor(): void {
    this.selectedTextColor = null;
    this.textColorChange.emit(null);
  }

  private buildGradient(): string {
    return `linear-gradient(${this.gradientDirection}, ${this.gradientColor1}, ${this.gradientColor2})`;
  }

  private emitColor(color: string): void {
    // Update color history
    const history = addToColorHistory(color, this.colorHistory());
    this.colorHistory.set(history);
    saveColorHistory(history);

    this.colorChange.emit(color);
  }
}
