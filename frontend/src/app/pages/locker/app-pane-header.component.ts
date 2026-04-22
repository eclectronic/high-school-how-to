import { Component, Input, Output, EventEmitter, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { autoContrastColor } from '../../shared/color-picker/color-utils';

const APP_DEFS: Record<string, { label: string; icon: string; helpText: string }> = {
  TODO: {
    label: 'To-dos',
    icon: '📋',
    helpText: 'Manage your task lists and to-dos. Click a list to see its tasks. Check off tasks as you complete them.',
  },
  NOTES: {
    label: 'Notes',
    icon: '📝',
    helpText: 'Create and edit personal notes. Click a note to edit it. Changes are saved automatically.',
  },
  TIMER: {
    label: 'Timer',
    icon: '⏱',
    helpText: 'Use a basic countdown timer or a Pomodoro timer to manage your focus sessions.',
  },
  SHORTCUTS: {
    label: 'Pins',
    icon: '📌',
    helpText: 'Save links to your favourite sites. Click a pin to open it in a new tab.',
  },
};

@Component({
  selector: 'app-pane-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-pane-header.component.html',
  styleUrl: './app-pane-header.component.scss',
})
export class AppPaneHeaderComponent {
  @Input({ required: true }) appType!: string;
  @Input({ required: true }) paletteColor!: string;
  @Input() paletteGradient?: string;
  @Input() subtitle?: string;
  @Input() paneIndex = 0;
  @Input() canClose = true;
  @Input() showWindowButtons = true;

  @Input() appColor?: string;

  @Output() close = new EventEmitter<void>();
  @Output() colorPickerRequest = new EventEmitter<void>();

  protected showTooltip = signal(false);
  protected tooltipPos = signal<{ top: string; left: string } | null>(null);

  @HostListener('document:keydown.escape')
  onEscape(): void { this.showTooltip.set(false); }

  protected get appDef() {
    return APP_DEFS[this.appType] ?? { label: this.appType, icon: '📌', helpText: '' };
  }

  protected get textColor(): string {
    return autoContrastColor(this.paletteColor.startsWith('#') ? this.paletteColor : '#fefdf4');
  }

  protected toggleTooltip(event: MouseEvent): void {
    if (!this.showTooltip()) {
      const btn = event.currentTarget as HTMLElement;
      const rect = btn.getBoundingClientRect();
      const tooltipWidth = 260;
      const left = Math.min(rect.left, window.innerWidth - tooltipWidth - 8);
      this.tooltipPos.set({ top: `${rect.bottom + 6}px`, left: `${Math.max(8, left)}px` });
    }
    this.showTooltip.update(v => !v);
  }

  protected hideTooltip(): void {
    this.showTooltip.set(false);
  }
}
