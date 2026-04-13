import {
  Component, HostListener, Input, Output, EventEmitter, OnInit, OnChanges, signal, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ColorPaletteApiService } from '../../core/services/color-palette-api.service';
import { isGradient, lastHexFromGradient } from '../color-picker/color-utils';

/**
 * User-facing color chooser.  Displays the admin-configured swatch palette.
 * Text color is always computed automatically for maximum contrast.
 *
 * Inputs  : selectedColor
 * Outputs : colorChange, escaped
 */
@Component({
  selector: 'app-swatch-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="swatch-picker">
      <div class="swatch-row">
        @for (color of palette(); track color) {
          <button type="button" class="swatch"
                  [style.background]="gradientMode ? buildGradient(color) : color"
                  [class.swatch--selected]="currentColor() === color"
                  [title]="color"
                  (click)="selectColor(color)"
                  (dblclick)="commitColor(color)">
          </button>
        }
      </div>
      @if (showGradientToggle) {
        <label class="gradient-toggle">
          <input type="checkbox" [(ngModel)]="gradientMode" (change)="onGradientToggle()" />
          White-to-color gradient
        </label>
      }
    </div>
  `,
  styles: [`
    .swatch-picker {
      font-family: var(--font-body);
      font-size: 0.85rem;
    }

    .swatch-row {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }

    .gradient-toggle {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin-top: 0.5rem;
      font-size: 0.8rem;
      cursor: pointer;
      user-select: none;

      input[type=checkbox] { cursor: pointer; }
    }

    .swatch {
      width: 26px;
      height: 26px;
      border-radius: 5px;
      border: 2px solid transparent;
      cursor: pointer;
      outline: none;
      transition: transform 0.1s, border-color 0.1s;
      box-shadow: 0 1px 3px rgba(0,0,0,0.15);

      &:hover { transform: scale(1.15); border-color: rgba(0,0,0,0.3); }
      &--selected { border-color: #2d1a10 !important; }
    }
  `],
})
export class SwatchPickerComponent implements OnInit, OnChanges {
  @Input() selectedColor = '#fffef8';
  @Input() showGradientToggle = true;
  @Output() colorChange = new EventEmitter<string>();
  @Output() colorCommit = new EventEmitter<string>();
  @Output() escaped = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.escaped.emit();
  }

  private readonly paletteApi = inject(ColorPaletteApiService);

  protected palette = signal<string[]>(this.paletteApi.getDefaultPalette());
  protected currentColor = signal<string>('#fffef8');
  protected gradientMode = false;

  ngOnInit(): void {
    this.paletteApi.getPalette().subscribe({
      next: colors => this.palette.set(colors),
    });
  }

  ngOnChanges(): void {
    if (isGradient(this.selectedColor)) {
      this.gradientMode = true;
      const endColor = lastHexFromGradient(this.selectedColor);
      this.currentColor.set(endColor ?? '#fef3c7');
    } else {
      this.gradientMode = false;
      this.currentColor.set(this.selectedColor);
    }
  }

  protected buildGradient(hex: string): string {
    return `linear-gradient(to bottom, #ffffff, ${hex})`;
  }

  private buildColor(hex: string): string {
    return this.gradientMode ? this.buildGradient(hex) : hex;
  }

  protected onGradientToggle(): void {
    this.colorChange.emit(this.buildColor(this.currentColor()));
  }

  protected selectColor(color: string): void {
    this.currentColor.set(color);
    this.colorChange.emit(this.buildColor(color));
  }

  protected commitColor(color: string): void {
    this.currentColor.set(color);
    this.colorCommit.emit(this.buildColor(color));
  }
}
