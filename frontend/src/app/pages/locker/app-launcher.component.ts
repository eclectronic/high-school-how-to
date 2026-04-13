import { Component, Input, Output, EventEmitter, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppPreferences } from '../../core/services/app-preferences-api.service';
import { Palette } from './palettes';
import { DailyQuoteComponent } from './features/daily-quote.component';
import { ShortcutsRowComponent } from './features/shortcuts-row.component';
import { EditModeComponent } from './edit-mode.component';
import { StickerApiService } from '../../core/services/sticker-api.service';
import { Sticker } from '../../core/models/task.models';

export const APP_DEFS = [
  { type: 'TODO',  label: 'To-do',  icon: '📋' },
  { type: 'NOTES', label: 'Notes',  icon: '📝' },
  { type: 'TIMER', label: 'Timer',  icon: '⏱' },
];

interface StickerPosition {
  sticker: Sticker;
  x: number;
  y: number;
  rotation: number;
}

@Component({
  selector: 'app-app-launcher',
  standalone: true,
  imports: [CommonModule, DailyQuoteComponent, ShortcutsRowComponent, EditModeComponent],
  templateUrl: './app-launcher.component.html',
  styleUrl: './app-launcher.component.scss',
})
export class AppLauncherComponent implements OnInit {
  @Input({ required: true }) preferences!: AppPreferences;
  @Input({ required: true }) palette!: Palette;
  @Input() editMode = false;

  @Output() launchApp = new EventEmitter<string>();
  @Output() editModeChange = new EventEmitter<boolean>();
  @Output() preferencesChange = new EventEmitter<AppPreferences>();

  private readonly stickerApi = inject(StickerApiService);

  protected readonly appDefs = APP_DEFS;
  protected stickerPositions = signal<StickerPosition[]>([]);

  ngOnInit(): void {
    this.loadStickers();
  }

  private loadStickers(): void {
    this.stickerApi.getStickers().subscribe({
      next: stickers => {
        const positions = stickers.map((s, i) => ({
          sticker: s,
          x: 5 + (i * 15) % 85,
          y: 10 + (i * 23) % 75,
          rotation: (i % 2 === 0 ? 1 : -1) * ((i * 7) % 20),
        }));
        this.stickerPositions.set(positions);
      },
    });
  }

  protected isActive(appType: string): boolean {
    return this.preferences.activeApps.includes(appType);
  }

  protected getAccentColor(appType: string): string {
    return this.palette.colors[appType as keyof typeof this.palette.colors] ?? '#888';
  }

  protected onAppClick(appType: string): void {
    if (this.editMode) {
      this.toggleAppInEditMode(appType);
      return;
    }
    if (this.isActive(appType)) {
      this.launchApp.emit(appType);
    }
  }

  private toggleAppInEditMode(appType: string): void {
    const activeApps = [...this.preferences.activeApps];
    const idx = activeApps.indexOf(appType);
    if (idx >= 0) {
      if (activeApps.length <= 1) return; // keep at least one
      activeApps.splice(idx, 1);
    } else {
      if (activeApps.length >= 3) return;
      activeApps.push(appType);
    }
    this.preferencesChange.emit({ ...this.preferences, activeApps });
  }

  protected onCustomize(): void {
    this.editModeChange.emit(true);
  }

  protected onEditSave(prefs: AppPreferences): void {
    this.preferencesChange.emit(prefs);
    this.editModeChange.emit(false);
  }

  protected onEditClose(): void {
    this.editModeChange.emit(false);
  }
}
