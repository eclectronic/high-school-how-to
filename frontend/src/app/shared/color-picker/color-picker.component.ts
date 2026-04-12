import { Component, HostListener, Input, Output, EventEmitter, OnChanges, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  autoContrastColor,
  contrastRatio,
  isGradient,
  firstHexFromGradient,
  isHexColor,
} from './color-utils';

@Component({
  selector: 'app-color-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="color-picker">
      <!-- Color input row -->
      <div class="color-row">
        <input type="color" class="native-color" [value]="solidColor()"
               (input)="onNativeColorInput($event)"
               (change)="onNativeColorChange($event)" />
        <input type="text" class="hex-input" [value]="solidColor()"
               (blur)="applyHexValue($event)"
               (keydown.enter)="applyHexValue($event)"
               placeholder="#rrggbb" maxlength="7" />
      </div>

      <!-- Gradient checkbox -->
      <label class="gradient-label">
        <input type="checkbox" [checked]="gradientEnabled()"
               (change)="onGradientToggle($event)" />
        <span>Gradient (white → color)</span>
      </label>

      <!-- Text color section -->
      <div class="text-color-section">
        <div class="text-color-header">
          <span class="section-label">Text Color</span>
        </div>
        <div class="text-color-row">
          <label class="radio-label">
            <input type="radio" name="textColorMode" [checked]="!selectedTextColor"
                   (change)="clearTextColor()" />
            <span>Auto</span>
          </label>
          <label class="radio-label">
            <input type="radio" name="textColorMode" [checked]="!!selectedTextColor"
                   (change)="enableManualTextColor()" />
            <span>Custom</span>
          </label>
          @if (selectedTextColor) {
            <input type="color" class="native-color native-color--small"
                   [value]="selectedTextColor"
                   (input)="onTextColorNativeInput($event)" />
            <input type="text" class="hex-input hex-input--small"
                   [value]="selectedTextColor"
                   (input)="onTextColorHexInput($event)"
                   placeholder="#rrggbb" maxlength="7" />
            @if (lowContrast()) {
              <span class="low-contrast-badge">⚠ Low contrast</span>
            }
          } @else {
            <span class="auto-label">Auto ({{ autoTextColor() }})</span>
          }
        </div>
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

    .color-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .native-color {
      cursor: pointer;
      height: 36px;
      width: 44px;
      border-radius: 4px;
      border: 1px solid rgba(45, 26, 16, 0.2);
      padding: 2px;
      flex-shrink: 0;

      &--small { height: 28px; width: 36px; }
    }

    .hex-input {
      width: 90px;
      padding: 0.25rem 0.4rem;
      border-radius: 4px;
      border: 1px solid rgba(45, 26, 16, 0.2);
      font-family: monospace;
      font-size: 0.8rem;

      &--small { width: 80px; }
    }

    .gradient-label {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      cursor: pointer;
      font-size: 0.82rem;
      color: #5f4f43;
    }

    .section-label { color: #5f4f43; font-size: 0.8rem; }

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

    .text-color-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .radio-label {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      cursor: pointer;
      font-size: 0.82rem;
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
  `],
})
export class ColorPickerComponent implements OnChanges {
  @Input() selectedColor = '#fffef8';
  @Input() selectedTextColor: string | null = null;
  @Output() colorChange = new EventEmitter<string>();
  @Output() textColorChange = new EventEmitter<string | null>();
  @Output() escaped = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.escaped.emit();
  }

  /** Internal signal tracking the current color so computed() can react to changes. */
  protected readonly currentColor = signal<string>('#fffef8');

  /**
   * The solid hex portion of the current selection (strips gradient wrapper).
   * For our gradients (white → color), returns the END (second) color.
   */
  protected solidColor = computed(() => {
    const color = this.currentColor();
    if (isGradient(color)) {
      // Our gradient format is always `linear-gradient(to bottom, #ffffff, <selectedColor>)`
      // Extract all hex values and return the last one (the selected color).
      const hexes = color.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g);
      if (hexes && hexes.length >= 2) return hexes[hexes.length - 1];
      return firstHexFromGradient(color) ?? '#fffef8';
    }
    return isHexColor(color) ? color : '#fffef8';
  });

  protected gradientEnabled = computed(() => isGradient(this.currentColor()));

  protected autoTextColor = computed(() => {
    const color = this.currentColor();
    if (isGradient(color)) {
      const first = firstHexFromGradient(color);
      return first ? autoContrastColor(first) : '#000000';
    }
    return isHexColor(color) ? autoContrastColor(color) : '#000000';
  });

  protected lowContrast = computed(() => {
    if (!this.selectedTextColor) return false;
    const color = this.currentColor();
    const bg = isGradient(color) ? (firstHexFromGradient(color) ?? '#fffef8') : color;
    if (!isHexColor(bg) || !isHexColor(this.selectedTextColor)) return false;
    return contrastRatio(bg, this.selectedTextColor) < 4.5;
  });

  ngOnChanges(): void {
    this.currentColor.set(this.selectedColor);
  }

  protected onNativeColorInput(event: Event): void {
    const hex = (event.target as HTMLInputElement).value;
    this.applyColor(hex);
  }

  protected onNativeColorChange(event: Event): void {
    const hex = (event.target as HTMLInputElement).value;
    this.applyColor(hex);
  }

  protected applyHexValue(event: Event): void {
    const value = (event.target as HTMLInputElement).value.trim();
    if (isHexColor(value)) {
      this.applyColor(value);
    }
  }

  protected onGradientToggle(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const hex = this.solidColor();
    if (checked) {
      this.emitColor(`linear-gradient(to bottom, #ffffff, ${hex})`);
    } else {
      this.emitColor(hex);
    }
  }

  protected clearTextColor(): void {
    this.selectedTextColor = null;
    this.textColorChange.emit(null);
  }

  protected enableManualTextColor(): void {
    if (!this.selectedTextColor) {
      this.selectedTextColor = this.autoTextColor();
      this.textColorChange.emit(this.selectedTextColor);
    }
  }

  protected onTextColorNativeInput(event: Event): void {
    this.selectedTextColor = (event.target as HTMLInputElement).value;
    this.textColorChange.emit(this.selectedTextColor);
  }

  protected onTextColorHexInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value.trim();
    if (isHexColor(value)) {
      this.selectedTextColor = value;
      this.textColorChange.emit(this.selectedTextColor);
    }
  }

  private applyColor(hex: string): void {
    if (this.gradientEnabled()) {
      this.emitColor(`linear-gradient(to bottom, #ffffff, ${hex})`);
    } else {
      this.emitColor(hex);
    }
  }

  private emitColor(color: string): void {
    this.selectedColor = color;
    this.currentColor.set(color);
    this.colorChange.emit(color);
  }
}
