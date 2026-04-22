import { Component, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppPreferences } from '../../core/services/app-preferences-api.service';
import { SwatchPickerComponent } from '../../shared/swatch-picker/swatch-picker.component';

const DEFAULT_LOCKER_COLOR = '#f5ede0';

const APP_DEFS = [
  { type: 'TODO',  label: 'To-do',  icon: '📋' },
  { type: 'NOTES', label: 'Notes',  icon: '📝' },
  { type: 'TIMER', label: 'Timer',  icon: '⏱' },
];

@Component({
  selector: 'app-edit-mode',
  standalone: true,
  imports: [CommonModule, SwatchPickerComponent],
  templateUrl: './edit-mode.component.html',
  styleUrl: './edit-mode.component.scss',
})
export class EditModeComponent implements OnInit {
  @Input({ required: true }) preferences!: AppPreferences;

  @Output() save = new EventEmitter<AppPreferences>();
  @Output() close = new EventEmitter<void>();

  protected draft = signal<AppPreferences>({ activeApps: [], paneOrder: null, paletteName: 'ocean', lockerColor: null, fontFamily: null, lockerTextSize: 'DEFAULT', appColors: null });
  protected readonly appDefs = APP_DEFS;

  protected readonly defaultLockerColor = DEFAULT_LOCKER_COLOR;

  protected get currentLockerColor(): string {
    return this.draft().lockerColor || DEFAULT_LOCKER_COLOR;
  }

  ngOnInit(): void {
    this.draft.set({ ...this.preferences, activeApps: [...this.preferences.activeApps] });
  }

  protected onLockerColorChange(color: string): void {
    this.draft.update(d => ({ ...d, lockerColor: color }));
  }

  protected resetLockerColor(): void {
    this.draft.update(d => ({ ...d, lockerColor: null }));
  }

  protected isAppActive(appType: string): boolean {
    return this.draft().activeApps.includes(appType);
  }

  protected toggleApp(appType: string): void {
    const current = this.draft();
    const isActive = current.activeApps.includes(appType);

    if (isActive) {
      if (current.activeApps.length <= 1) return; // keep at least one
      this.draft.set({ ...current, activeApps: current.activeApps.filter(a => a !== appType) });
    } else {
      if (current.activeApps.length >= 3) return; // max 3
      this.draft.set({ ...current, activeApps: [...current.activeApps, appType] });
    }
  }

  protected onSave(): void {
    this.save.emit(this.draft());
  }

  protected onClose(): void {
    this.close.emit();
  }

  protected onBackdropClick(): void {
    this.close.emit();
  }
}
