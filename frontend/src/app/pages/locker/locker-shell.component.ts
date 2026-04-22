import {
  Component, OnInit, OnDestroy, signal, computed, HostListener, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppPreferencesApiService, AppPreferences, LockerTextSize } from '../../core/services/app-preferences-api.service';
import { deriveThemeFromColor, getPaletteGradient, Palette } from './palettes';
import { AppPaneLayoutComponent, FONT_OPTIONS } from './app-pane-layout.component';
import { AppSwipeContainerComponent } from './app-swipe-container.component';
import { LockerOpeningAnimationComponent } from './locker-opening-animation.component';
import { SiteNavComponent } from '../../shared/site-nav/site-nav.component';

@Component({
  selector: 'app-locker-shell',
  standalone: true,
  imports: [CommonModule, AppPaneLayoutComponent, AppSwipeContainerComponent, LockerOpeningAnimationComponent, SiteNavComponent],
  templateUrl: './locker-shell.component.html',
  styleUrl: './locker-shell.component.scss',
})
export class LockerShellComponent implements OnInit, OnDestroy {
  private readonly preferencesApi = inject(AppPreferencesApiService);

  protected readonly DEFAULT_LOCKER_COLOR = '#f5ede0';

  protected preferences = signal<AppPreferences>({
    activeApps: ['TODO', 'NOTES', 'TIMER'],
    paneOrder: null,
    paletteName: 'ocean',
    lockerColor: null,
    fontFamily: null,
    lockerTextSize: 'DEFAULT',
    appColors: null,
  });

  protected readonly lockerScaleCss = computed(() => {
    const scale: Record<LockerTextSize, number> = {
      SMALL: 1,
      DEFAULT: 1.15,
      LARGE: 1.3,
      XLARGE: 1.5,
    };
    return scale[this.preferences().lockerTextSize] ?? 1.15;
  });

  protected isMobile = signal(false);
  protected focusedPaneIndex = signal(0);
  protected showAnimation = signal(true);

  protected activePalette = computed<Palette>(() =>
    deriveThemeFromColor(this.preferences().lockerColor ?? this.DEFAULT_LOCKER_COLOR)
  );

  protected doorGradient = computed(() =>
    this.preferences().lockerColor ?? getPaletteGradient(this.activePalette(), 'TODO')
  );

  protected fontCss = computed(() => {
    const opt = FONT_OPTIONS.find(f => f.value === this.preferences().fontFamily);
    return opt?.css ?? FONT_OPTIONS[0].css;
  });

  private resizeObserver?: ResizeObserver;

  ngOnInit(): void {
    this.checkMobile();
    this.setupResizeObserver();
    this.preferencesApi.getPreferences().subscribe({
      next: prefs => this.preferences.set(prefs),
    });
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  private checkMobile(): void {
    this.isMobile.set(window.innerWidth <= 768);
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.isMobile.set(window.innerWidth <= 768);
    });
    this.resizeObserver.observe(document.body);
  }

  protected focusPane(index: number): void {
    this.focusedPaneIndex.set(index);
  }

  protected createNewItemSignal = signal(0);

  protected createNewItem(): void {
    this.createNewItemSignal.set(this.createNewItemSignal() + 1);
  }

  protected onAppsReorder(apps: string[]): void {
    this.onPreferencesChange({ ...this.preferences(), activeApps: apps });
  }

  protected onLockerColorChange(color: string | null): void {
    this.onPreferencesChange({ ...this.preferences(), lockerColor: color });
  }

  protected onFontFamilyChange(fontFamily: string | null): void {
    this.onPreferencesChange({ ...this.preferences(), fontFamily });
  }

  protected onTextSizeChange(lockerTextSize: LockerTextSize): void {
    this.onPreferencesChange({ ...this.preferences(), lockerTextSize });
  }

  protected onAppColorChange({ appType, color }: { appType: string; color: string | null }): void {
    const current = this.preferences().appColors ?? {};
    const updated = color ? { ...current, [appType]: color } : Object.fromEntries(
      Object.entries(current).filter(([k]) => k !== appType)
    );
    this.onPreferencesChange({ ...this.preferences(), appColors: Object.keys(updated).length ? updated : null });
  }

  protected onPreferencesChange(prefs: AppPreferences): void {
    this.preferences.set(prefs);
    this.preferencesApi.updatePreferences(prefs).subscribe({
      next: saved => this.preferences.set(saved),
    });
  }

  protected onAnimationDone(): void {
    this.showAnimation.set(false);
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (this.isMobile()) return;

    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable ||
      target.tagName === 'SELECT'
    ) {
      return;
    }

    switch (event.key) {
      case '1': event.preventDefault(); this.focusPane(0); break;
      case '2': event.preventDefault(); this.focusPane(1); break;
      case '3': event.preventDefault(); this.focusPane(2); break;
      case 'n': event.preventDefault(); this.createNewItem(); break;
    }
  }
}
