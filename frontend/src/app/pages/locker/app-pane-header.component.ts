import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
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
  @Input() isMaximized = false;
  @Input() canMinimize = true;
  @Input() canClose = true;
  @Input() showWindowButtons = true;

  @Output() minimize = new EventEmitter<void>();
  @Output() maximize = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  protected showTooltip = signal(false);

  protected get appDef() {
    return APP_DEFS[this.appType] ?? { label: this.appType, icon: '📌', helpText: '' };
  }

  protected get textColor(): string {
    // Header is transparent over the pastel pane body — always use dark text
    return '#2d1a10';
  }

  protected toggleTooltip(): void {
    this.showTooltip.update(v => !v);
  }

  protected hideTooltip(): void {
    this.showTooltip.set(false);
  }
}
