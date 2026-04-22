import { Component, computed, ElementRef, HostListener, Input, OnInit, ViewChild, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { switchMap, of, catchError } from 'rxjs';
import { ShortcutApiService, CreateShortcutRequest } from '../../../core/services/shortcut-api.service';
import { RecommendedPinApiService } from '../../../core/services/recommended-pin-api.service';
import { Shortcut, RecommendedPin } from '../../../core/models/task.models';
import { EmojiPickerComponent } from '../../../shared/emoji-picker/emoji-picker.component';

const SORT_MODE_STORAGE_KEY = 'shortcuts.sortMode';

const GSTATIC = 'https://ssl.gstatic.com/images/branding/product/2x/';

// Known favicon URLs for services where the favicon service returns the wrong icon.
// Google product icons use ssl.gstatic.com; Classroom and Scholar use bundled local assets
// since they are not in Google's standard product branding set.
const KNOWN_FAVICONS: Record<string, string> = {
  'gmail.com':            GSTATIC + 'gmail_2020q4_48dp.png',
  'mail.google.com':      GSTATIC + 'gmail_2020q4_48dp.png',
  'calendar.google.com':  GSTATIC + 'calendar_2020q4_48dp.png',
  'drive.google.com':     GSTATIC + 'drive_2020q4_48dp.png',
  'docs.google.com':      GSTATIC + 'docs_2020q4_48dp.png',
  'sheets.google.com':    GSTATIC + 'sheets_2020q4_48dp.png',
  'slides.google.com':    GSTATIC + 'slides_2020q4_48dp.png',
  'meet.google.com':      GSTATIC + 'meet_2020q4_48dp.png',
  'youtube.com':          GSTATIC + 'youtube_2020q4_48dp.png',
  'www.youtube.com':      GSTATIC + 'youtube_2020q4_48dp.png',
  'classroom.google.com': '/assets/favicons/google-classroom.png',
  'scholar.google.com':   '/assets/favicons/google-scholar.png',
};

@Component({
  selector: 'app-shortcuts-app',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, EmojiPickerComponent],
  templateUrl: './shortcuts-app.component.html',
  styleUrl: './shortcuts-app.component.scss',
})
export class ShortcutsAppComponent implements OnInit {
  @Input() paletteColor = '#888';

  private readonly shortcutApi = inject(ShortcutApiService);
  private readonly recommendedApi = inject(RecommendedPinApiService);

  protected shortcuts = signal<Shortcut[]>([]);
  protected sortMode = signal<'name' | 'custom'>(this.readStoredSortMode());
  protected readonly sortedShortcuts = computed(() => {
    const list = this.shortcuts();
    if (this.sortMode() === 'name') {
      return list.slice().sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    }
    return list;
  });

  protected showAddForm = signal(false);
  protected newUrl = '';
  protected newName = '';
  protected newEmoji = '';
  protected adding = signal(false);
  protected editingId = signal<string | null>(null);
  protected editUrl = '';
  protected editName = '';
  protected editEmoji = '';
  protected showEmojiPickerFor = signal<'add' | 'edit' | null>(null);

  @ViewChild('doneBtn') private doneBtnRef?: ElementRef<HTMLButtonElement>;

  protected showBrowse = signal(false);
  protected recommendedPins = signal<RecommendedPin[]>([]);
  protected addingRecommendedId = signal<string | null>(null);

  ngOnInit(): void {
    this.shortcutApi.getShortcuts().subscribe({
      next: s => this.shortcuts.set(s),
    });
  }

  protected openBrowse(): void {
    this.showBrowse.set(true);
    this.showAddForm.set(false);
    this.editingId.set(null);
    if (this.recommendedPins().length === 0) {
      this.recommendedApi.getRecommendedPins().subscribe({
        next: pins => this.recommendedPins.set(pins),
      });
    }
    setTimeout(() => this.doneBtnRef?.nativeElement.focus(), 0);
  }

  protected closeBrowse(): void {
    this.showBrowse.set(false);
  }

  protected onShortcutRowKeydown(event: KeyboardEvent, sc: Shortcut): void {
    switch (event.key) {
      case ' ':
        event.preventDefault();
        this.openShortcut(sc.url);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.focusAdjacentShortcutRow(event.currentTarget as HTMLElement, 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusAdjacentShortcutRow(event.currentTarget as HTMLElement, -1);
        break;
    }
  }

  private focusAdjacentShortcutRow(current: HTMLElement, dir: 1 | -1): void {
    const rows = Array.from(
      current.closest('.shortcuts-list')?.querySelectorAll<HTMLElement>('.shortcut-row') ?? []
    );
    const idx = rows.indexOf(current);
    rows[idx + dir]?.focus();
  }

  protected onBrowseRowKeydown(event: KeyboardEvent, pin: RecommendedPin): void {
    switch (event.key) {
      case ' ':
      case 'a':
      case 'A':
      case '+':
        event.preventDefault();
        this.toggleRecommended(pin);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.focusAdjacentBrowseRow(event.currentTarget as HTMLElement, 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusAdjacentBrowseRow(event.currentTarget as HTMLElement, -1);
        break;
    }
  }

  private focusAdjacentBrowseRow(current: HTMLElement, dir: 1 | -1): void {
    const rows = Array.from(
      current.closest('.shortcuts-browse__list')?.querySelectorAll<HTMLElement>('.shortcuts-browse__row') ?? []
    );
    const idx = rows.indexOf(current);
    rows[idx + dir]?.focus();
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (!this.showBrowse()) return;
    if (event.key !== 'Enter' && event.key !== 'Escape') return;
    const target = event.target as HTMLElement;
    // Let Enter on a pin add/remove button do its normal action
    if (event.key === 'Enter' && target?.classList.contains('shortcuts-browse__add-btn')) return;
    event.preventDefault();
    this.closeBrowse();
  }

  protected get recommendedCategories(): string[] {
    const cats = new Set(this.recommendedPins().map(p => p.category ?? ''));
    return [...cats].sort();
  }

  protected pinsInCategory(cat: string): RecommendedPin[] {
    return this.recommendedPins().filter(p => (p.category ?? '') === cat);
  }

  protected isAlreadyAdded(pin: RecommendedPin): boolean {
    return this.shortcuts().some(s => s.url === pin.url);
  }

  protected addRecommended(pin: RecommendedPin): void {
    if (this.addingRecommendedId() === pin.id) return;
    this.addingRecommendedId.set(pin.id);
    this.shortcutApi.createShortcut({
      url: pin.url,
      name: pin.name,
      faviconUrl: pin.faviconUrl ?? undefined,
      // only use emoji when there is no favicon to show
      emoji: pin.faviconUrl ? undefined : (pin.emoji ?? undefined),
    }).subscribe({
      next: s => {
        this.shortcuts.update(list => [...list, s]);
        this.addingRecommendedId.set(null);
      },
      error: () => this.addingRecommendedId.set(null),
    });
  }

  protected removeRecommended(pin: RecommendedPin): void {
    if (this.addingRecommendedId() === pin.id) return;
    const existing = this.shortcuts().find(s => s.url === pin.url);
    if (!existing) return;
    this.addingRecommendedId.set(pin.id);
    this.shortcutApi.deleteShortcut(existing.id).subscribe({
      next: () => {
        this.shortcuts.update(list => list.filter(s => s.id !== existing.id));
        this.addingRecommendedId.set(null);
      },
      error: () => this.addingRecommendedId.set(null),
    });
  }

  protected toggleRecommended(pin: RecommendedPin): void {
    if (this.isAlreadyAdded(pin)) {
      this.removeRecommended(pin);
    } else {
      this.addRecommended(pin);
    }
  }

  protected openShortcut(url: string): void {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  protected openAddForm(): void {
    this.newUrl = '';
    this.newName = '';
    this.newEmoji = '';
    this.showAddForm.set(true);
    this.editingId.set(null);
  }

  protected cancelAdd(): void {
    this.showAddForm.set(false);
    this.showEmojiPickerFor.set(null);
  }

  protected onEmojiSelected(emoji: string | null, context: 'add' | 'edit'): void {
    if (context === 'add') this.newEmoji = emoji ?? '';
    else this.editEmoji = emoji ?? '';
    this.showEmojiPickerFor.set(null);
  }

  protected submitAdd(): void {
    const url = this.normalizeUrl(this.newUrl.trim());
    if (!url) return;
    this.adding.set(true);

    const providedName = this.newName.trim();
    const emoji = this.newEmoji.trim() || null;

    // If no name given, try to fetch the page title first
    const name$ = providedName
      ? of(providedName)
      : this.shortcutApi.getMetadata(url).pipe(
          switchMap(meta => of(meta.title || '')),
          catchError(() => of('')),
        );

    name$.pipe(
      switchMap(fetchedName => {
        const req: CreateShortcutRequest = {
          url,
          name: fetchedName || url,
          emoji,
        };
        return this.shortcutApi.createShortcut(req);
      }),
    ).subscribe({
      next: s => {
        this.shortcuts.update(list => [...list, s]);
        this.showAddForm.set(false);
        this.adding.set(false);
        this.newUrl = '';
        this.newName = '';
        this.newEmoji = '';
      },
      error: () => this.adding.set(false),
    });
  }

  private normalizeUrl(url: string): string {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    return `https://${url}`;
  }

  protected startEdit(sc: Shortcut): void {
    this.editingId.set(sc.id);
    this.editUrl = sc.url;
    this.editName = sc.name;
    this.editEmoji = sc.emoji ?? '';
    this.showAddForm.set(false);
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
  }

  protected submitEdit(): void {
    const id = this.editingId();
    if (!id) return;
    const url = this.normalizeUrl(this.editUrl.trim());
    if (!url) return;
    this.shortcutApi.updateShortcut(id, {
      url,
      name: this.editName.trim() || url,
      emoji: this.editEmoji.trim() || null,
    }).subscribe({
      next: updated => {
        this.shortcuts.update(list => list.map(s => s.id === updated.id ? updated : s));
        this.editingId.set(null);
      },
    });
  }

  protected onDrop(event: CdkDragDrop<Shortcut[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const reordered = this.shortcuts().slice();
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    this.shortcuts.set(reordered);
    this.shortcutApi.reorderShortcuts(reordered.map(s => s.id)).subscribe();
  }

  private readStoredSortMode(): 'name' | 'custom' {
    try {
      const raw = localStorage.getItem(SORT_MODE_STORAGE_KEY);
      if (raw === 'name' || raw === 'custom') return raw;
    } catch { /* non-fatal */ }
    return 'custom';
  }

  protected setSortMode(mode: 'name' | 'custom'): void {
    this.sortMode.set(mode);
    try { localStorage.setItem(SORT_MODE_STORAGE_KEY, mode); } catch { /* non-fatal */ }
  }

  protected deleteShortcut(id: string): void {
    this.shortcutApi.deleteShortcut(id).subscribe({
      next: () => this.shortcuts.update(list => list.filter(s => s.id !== id)),
    });
  }

  protected getFaviconSrc(sc: Shortcut): string {
    if (sc.iconUrl) return sc.iconUrl;
    if (sc.faviconUrl) return sc.faviconUrl;
    try {
      const domain = new URL(sc.url).hostname;
      return KNOWN_FAVICONS[domain] ?? `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return '';
    }
  }
}
