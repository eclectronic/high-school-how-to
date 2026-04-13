import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, signal, NgZone, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Palette, getPaletteGradient } from './palettes';
import { AppPaneHeaderComponent } from './app-pane-header.component';
import { TodoAppComponent } from './apps/todo-app.component';
import { NotesAppComponent } from './apps/notes-app.component';
import { TimerAppComponent } from './apps/timer-app.component';
import { ShortcutsAppComponent } from './apps/shortcuts-app.component';
import { SwatchPickerComponent } from '../../shared/swatch-picker/swatch-picker.component';

const RESIZER_PX = 12;
const MIN_WEIGHT_FRACTION = 0.12; // each pane must stay at least 12% of available width

const ALL_APP_DEFS = [
  { type: 'TODO',      label: 'To-do',    icon: '📋' },
  { type: 'NOTES',     label: 'Notes',    icon: '📝' },
  { type: 'TIMER',     label: 'Timer',    icon: '⏱' },
  { type: 'SHORTCUTS', label: 'Shortcuts', icon: '🔗' },
] as const;

export const FONT_OPTIONS = [
  { value: null,           label: 'Default',       css: 'system-ui, -apple-system, sans-serif',           group: 'Standard' },
  { value: 'serif',        label: 'Serif',          css: 'Georgia, "Times New Roman", serif',              group: 'Standard' },
  { value: 'mono',         label: 'Mono',           css: '"Courier New", Courier, monospace',              group: 'Standard' },
  { value: 'rounded',      label: 'Rounded',        css: '"Trebuchet MS", "Lucida Sans", sans-serif',      group: 'Standard' },
  { value: 'nunito',        label: 'Nunito',         css: '"Nunito", sans-serif',                           group: 'Dyslexia-friendly' },
  { value: 'lexend',        label: 'Lexend',         css: '"Lexend", sans-serif',                           group: 'Dyslexia-friendly' },
  { value: 'opendyslexic', label: 'OpenDyslexic',   css: '"OpenDyslexic", sans-serif',                     group: 'Dyslexia-friendly' },
  { value: 'comic-sans',   label: 'Comic Sans',     css: '"Comic Sans MS", "Comic Sans", cursive',         group: 'Dyslexia-friendly' },
] as const;

@Component({
  selector: 'app-app-pane-layout',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AppPaneHeaderComponent,
    TodoAppComponent,
    NotesAppComponent,
    TimerAppComponent,
    ShortcutsAppComponent,
    SwatchPickerComponent,
  ],
  templateUrl: './app-pane-layout.component.html',
  styleUrl: './app-pane-layout.component.scss',
})
export class AppPaneLayoutComponent implements OnChanges {
  private readonly ngZone = inject(NgZone);

  @Input() activeApps: string[] = ['TODO', 'NOTES', 'TIMER'];
  @Input() palette!: Palette;
  @Input() focusedPane = 0;
  @Input() createNewItemTrigger = 0;
  @Input() lockerColor: string | null = null;
  @Input() fontFamily: string | null = null;

  @Output() appsReorder = new EventEmitter<string[]>();
  @Output() lockerColorChange = new EventEmitter<string | null>();
  @Output() fontFamilyChange = new EventEmitter<string | null>();

  protected readonly allAppDefs = ALL_APP_DEFS;
  protected readonly fontOptions = FONT_OPTIONS;

  protected focusedPaneSignal = signal(0);

  protected dragSourceIndex = signal<number | null>(null);
  protected dragOverIndex = signal<number | null>(null);
  protected appSubtitles = signal<Record<string, string>>({});
  protected appHeaderColors = signal<Record<string, string | null>>({});

  protected columnWeights = signal<number[]>(this.defaultWeights(['TODO', 'NOTES', 'TIMER']));
  protected activeResizer = signal<number | null>(null);

  protected maximizedApp = signal<string | null>(null);
  protected showLockerColorPicker = signal(false);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['activeApps']) {
      this.columnWeights.set(this.defaultWeights(this.activeApps));
    }
  }

  private defaultWeights(apps: string[]): number[] {
    if (apps.length <= 1) return [1];
    if (apps.length === 2) return [1, 1];
    return apps.map(a => (a === 'TIMER' ? 1 : 2));
  }

  protected getPaletteColor(appType: string): string {
    return this.palette?.colors[appType as keyof typeof this.palette.colors] ?? '#888';
  }

  protected getPaletteGradient(appType: string): string {
    return getPaletteGradient(this.palette, appType);
  }

  protected focusPane(index: number): void {
    this.focusedPaneSignal.set(index);
  }

  protected onAppSubtitleChange(appType: string, subtitle: string): void {
    this.appSubtitles.update(m => ({ ...m, [appType]: subtitle }));
  }

  protected onAppHeaderColorChange(appType: string, color: string | null): void {
    this.appHeaderColors.update(m => ({ ...m, [appType]: color }));
  }

  protected getHeaderColor(appType: string): string {
    return this.appHeaderColors()[appType] ?? this.getPaletteColor(appType);
  }

  protected toggleApp(appType: string): void {
    // If a different app is maximized, restore it so the selected app is visible
    if (this.maximizedApp() !== null) {
      this.maximizedApp.set(null);
    }

    const isActive = this.activeApps.includes(appType);
    if (isActive) {
      if (this.activeApps.length <= 1) return;
      this.appsReorder.emit(this.activeApps.filter(a => a !== appType));
    } else {
      this.appsReorder.emit([...this.activeApps, appType]);
    }
  }

  protected onMinimize(appType: string): void {
    // Restore from maximized only when there are other panes to show
    if (this.maximizedApp() === appType && this.activeApps.length > 1) {
      this.maximizedApp.set(null);
    }
  }

  protected onMaximize(appType: string): void {
    this.maximizedApp.update(current => current === appType ? null : appType);
  }

  protected onClose(appType: string): void {
    if (this.activeApps.length <= 1) return;
    if (this.maximizedApp() === appType) this.maximizedApp.set(null);
    this.appsReorder.emit(this.activeApps.filter(a => a !== appType));
  }

  protected isPaneHidden(appType: string): boolean {
    const maxed = this.maximizedApp();
    return maxed !== null && maxed !== appType;
  }

  protected onResizerMousedown(event: MouseEvent, resizerIndex: number): void {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWeights = [...this.columnWeights()];
    const totalWeight = startWeights.reduce((a, b) => a + b, 0);
    const container = (event.target as HTMLElement).closest('.pane-layout') as HTMLElement;
    const resizerCount = this.activeApps.length - 1;
    const availableWidth = container.clientWidth - resizerCount * RESIZER_PX;
    const minWeight = MIN_WEIGHT_FRACTION * totalWeight;

    this.activeResizer.set(resizerIndex);

    const onMove = (e: MouseEvent) => {
      const delta = ((e.clientX - startX) / availableWidth) * totalWeight;
      let left  = startWeights[resizerIndex] + delta;
      let right = startWeights[resizerIndex + 1] - delta;

      if (left < minWeight)  { left = minWeight;  right = startWeights[resizerIndex] + startWeights[resizerIndex + 1] - minWeight; }
      if (right < minWeight) { right = minWeight; left  = startWeights[resizerIndex] + startWeights[resizerIndex + 1] - minWeight; }

      const next = [...startWeights];
      next[resizerIndex] = left;
      next[resizerIndex + 1] = right;
      this.ngZone.run(() => this.columnWeights.set(next));
    };

    const onUp = () => {
      this.ngZone.run(() => this.activeResizer.set(null));
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  protected onDragStart(event: DragEvent, index: number): void {
    this.dragSourceIndex.set(index);
    event.dataTransfer?.setData('text/plain', String(index));
    event.dataTransfer && (event.dataTransfer.effectAllowed = 'move');
  }

  protected onDragOver(event: DragEvent, index: number): void {
    const src = this.dragSourceIndex();
    if (src === null || src === index) return;
    event.preventDefault();
    event.dataTransfer && (event.dataTransfer.dropEffect = 'move');
    this.dragOverIndex.set(index);
  }

  protected onDragLeave(event: DragEvent, index: number): void {
    const related = event.relatedTarget as Node | null;
    const pane = event.currentTarget as HTMLElement;
    if (!related || !pane.contains(related)) {
      if (this.dragOverIndex() === index) this.dragOverIndex.set(null);
    }
  }

  protected onDrop(event: DragEvent, dropIndex: number): void {
    event.preventDefault();
    const srcIndex = this.dragSourceIndex();
    this.dragSourceIndex.set(null);
    this.dragOverIndex.set(null);
    if (srcIndex === null || srcIndex === dropIndex) return;

    const next = [...this.activeApps];
    [next[srcIndex], next[dropIndex]] = [next[dropIndex], next[srcIndex]];
    this.appsReorder.emit(next);
  }

  protected onDragEnd(): void {
    this.dragSourceIndex.set(null);
    this.dragOverIndex.set(null);
  }
}
