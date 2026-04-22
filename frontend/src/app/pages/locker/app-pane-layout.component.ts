import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, signal, NgZone, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Palette, getPaletteGradient } from './palettes';
import { LockerTextSize } from '../../core/services/app-preferences-api.service';
import { AppPaneHeaderComponent } from './app-pane-header.component';
import { TodoAppComponent } from './apps/todo-app.component';
import { NotesAppComponent } from './apps/notes-app.component';
import { TimerAppComponent } from './apps/timer-app.component';
import { ShortcutsAppComponent } from './apps/shortcuts-app.component';
import { SwatchPickerComponent } from '../../shared/swatch-picker/swatch-picker.component';
import { PaneFocusTrapDirective } from '../../shared/pane-focus-trap.directive';

const RESIZER_PX = 12;
const MIN_PANE_PX = 240; // matches min-width in SCSS

const ALL_APP_DEFS = [
  { type: 'TODO',      label: 'To-do',    icon: '📋' },
  { type: 'NOTES',     label: 'Notes',    icon: '📝' },
  { type: 'TIMER',     label: 'Timer',    icon: '⏱' },
  { type: 'SHORTCUTS', label: 'Pins', icon: '📌' },
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
    PaneFocusTrapDirective,
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
  @Input() appColors: Record<string, string> | null = null;

  @Input() lockerTextSize: LockerTextSize = 'DEFAULT';

  @Output() appsReorder = new EventEmitter<string[]>();
  @Output() lockerColorChange = new EventEmitter<string | null>();
  @Output() fontFamilyChange = new EventEmitter<string | null>();
  @Output() textSizeChange = new EventEmitter<LockerTextSize>();
  @Output() appColorChange = new EventEmitter<{ appType: string; color: string | null }>();

  protected readonly allAppDefs = ALL_APP_DEFS;
  protected readonly fontOptions = FONT_OPTIONS;
  protected readonly textSizeOptions: { value: LockerTextSize; label: string }[] = [
    { value: 'SMALL', label: 'S' },
    { value: 'DEFAULT', label: 'M' },
    { value: 'LARGE', label: 'L' },
    { value: 'XLARGE', label: 'XL' },
  ];

  protected focusedPaneSignal = signal(0);

  protected dragSourceIndex = signal<number | null>(null);
  protected dragOverIndex = signal<number | null>(null);
  protected appSubtitles = signal<Record<string, string>>({});
  protected appHeaderColors = signal<Record<string, string | null>>({});

  protected columnWeights = signal<number[]>(this.defaultWeights(['TODO', 'NOTES', 'TIMER']));
  protected activeResizer = signal<number | null>(null);

  protected showLockerColorPicker = signal(false);
  protected showColorPickerForApp = signal<string | null>(null);

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

  protected getAppColor(appType: string): string {
    return this.appColors?.[appType] ?? this.getPaletteColor(appType);
  }

  protected getAppIcon(appType: string): string {
    return this.allAppDefs.find(d => d.type === appType)?.icon ?? '🎨';
  }

  protected getAppLabel(appType: string): string {
    return this.allAppDefs.find(d => d.type === appType)?.label ?? appType;
  }

  protected onAppColorPicked(appType: string, color: string): void {
    this.appColorChange.emit({ appType, color });
    this.showColorPickerForApp.set(null);
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

  // User-selected appColor takes priority over app-driven header color, then palette.
  // Used for pane tint and header background only — not for app-internal accents.
  protected getEffectivePaneTint(appType: string): string {
    return this.appColors?.[appType] ?? this.getHeaderColor(appType);
  }

  protected toggleApp(appType: string): void {
    const isActive = this.activeApps.includes(appType);
    if (isActive) {
      this.appsReorder.emit(this.activeApps.filter(a => a !== appType));
    } else {
      this.appsReorder.emit([...this.activeApps, appType]);
    }
  }

  protected onClose(appType: string): void {
    this.appsReorder.emit(this.activeApps.filter(a => a !== appType));
  }

  protected getPaneFlex(appType: string, index: number): string {
    if (appType === 'TIMER') return '0 0 auto';
    return `${this.columnWeights()[index]} 0 0`;
  }

  // Show a divider between any two adjacent panes.
  // If one side is the fixed-width TIMER the handle appears but dragging is inert.
  protected showResizer(resizerIndex: number): boolean {
    return !!this.activeApps[resizerIndex] && !!this.activeApps[resizerIndex + 1];
  }

  // A resizer is inert when the TIMER (fixed-width) is on one side and there is no
  // flexible pane on the other side to absorb the drag.
  protected isResizerInert(resizerIndex: number): boolean {
    const leftFlex  = this.activeApps.slice(0, resizerIndex + 1).some(a => a !== 'TIMER');
    const rightFlex = this.activeApps.slice(resizerIndex + 1).some(a => a !== 'TIMER');
    return !(leftFlex && rightFlex);
  }

  protected onResizerMousedown(event: MouseEvent, resizerIndex: number): void {
    event.preventDefault();
    event.stopPropagation();

    // Find the nearest flexible (non-TIMER) pane on each side of this resizer.
    let leftIdx = -1;
    for (let i = resizerIndex; i >= 0; i--) {
      if (this.activeApps[i] !== 'TIMER') { leftIdx = i; break; }
    }
    let rightIdx = -1;
    for (let i = resizerIndex + 1; i < this.activeApps.length; i++) {
      if (this.activeApps[i] !== 'TIMER') { rightIdx = i; break; }
    }
    if (leftIdx === -1 || rightIdx === -1) return;

    const startX = event.clientX;
    const startWeights = [...this.columnWeights()];
    const container = (event.target as HTMLElement).closest('.pane-layout') as HTMLElement;
    const resizerCount = this.activeApps.length - 1;

    // Measure the timer's fixed pixel width so the delta conversion stays accurate.
    const timerDomIdx = this.activeApps.indexOf('TIMER');
    let timerPx = 0;
    if (timerDomIdx >= 0) {
      const paneWraps = container.querySelectorAll('.pane-wrap');
      timerPx = (paneWraps[timerDomIdx] as HTMLElement)?.clientWidth ?? 0;
    }

    const flexTotal = startWeights[leftIdx] + startWeights[rightIdx];
    const availableWidth = container.clientWidth - resizerCount * RESIZER_PX - timerPx;
    const minWeight = (MIN_PANE_PX / availableWidth) * flexTotal;

    this.activeResizer.set(resizerIndex);

    const onMove = (e: MouseEvent) => {
      const delta = ((e.clientX - startX) / availableWidth) * flexTotal;
      let left  = startWeights[leftIdx] + delta;
      let right = startWeights[rightIdx] - delta;

      if (left  < minWeight) { left  = minWeight; right = flexTotal - minWeight; }
      if (right < minWeight) { right = minWeight; left  = flexTotal - minWeight; }

      const next = [...startWeights];
      next[leftIdx]  = left;
      next[rightIdx] = right;
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

  protected onTextSizeSelect(size: LockerTextSize): void {
    this.textSizeChange.emit(size);
  }
}
