import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { autoContrastColor } from '../../shared/color-picker/color-utils';

const APP_DEFS: Record<string, { label: string; icon: string; helpSlug: string | null }> = {
  TODO: {
    label: 'To-dos',
    icon: '📋',
    helpSlug: 'help-todo',
  },
  NOTES: {
    label: 'Notes',
    icon: '📝',
    helpSlug: 'help-notes',
  },
  TIMER: {
    label: 'Timer',
    icon: '⏱',
    helpSlug: 'help-timer',
  },
  SHORTCUTS: {
    label: 'Pins',
    icon: '📌',
    helpSlug: 'help-pins',
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
  @Output() helpRequest = new EventEmitter<string>();

  protected get appDef() {
    return APP_DEFS[this.appType] ?? { label: this.appType, icon: '📌', helpSlug: null };
  }

  protected get textColor(): string {
    return autoContrastColor(this.paletteColor.startsWith('#') ? this.paletteColor : '#fefdf4');
  }

  protected onHelpClick(): void {
    const slug = this.appDef.helpSlug;
    if (slug) this.helpRequest.emit(slug);
  }
}
