import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  QueryList,
  ViewChild,
  ViewChildren,
  signal,
} from '@angular/core';
import { Palette, getPaletteGradient } from './palettes';
import { TodoAppComponent } from './apps/todo-app.component';
import { NotesAppComponent } from './apps/notes-app.component';
import { TimerAppComponent } from './apps/timer-app.component';
import { ShortcutsAppComponent } from './apps/shortcuts-app.component';
import { AppPaneHeaderComponent } from './app-pane-header.component';

const APP_DEFS: { type: string; label: string; icon: string }[] = [
  { type: 'TODO',      label: 'To-do',     icon: '📋' },
  { type: 'NOTES',     label: 'Notes',     icon: '📝' },
  { type: 'TIMER',     label: 'Timer',     icon: '⏱' },
  { type: 'SHORTCUTS', label: 'Pins', icon: '📌' },
];

@Component({
  selector: 'app-swipe-container',
  standalone: true,
  imports: [
    TodoAppComponent,
    NotesAppComponent,
    TimerAppComponent,
    ShortcutsAppComponent,
    AppPaneHeaderComponent,
  ],
  templateUrl: './app-swipe-container.component.html',
  styleUrl: './app-swipe-container.component.scss',
})
export class AppSwipeContainerComponent implements AfterViewInit {
  @Input() palette!: Palette;

  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;
  @ViewChildren('page') pages!: QueryList<ElementRef<HTMLDivElement>>;

  protected currentPage = signal(0);

  protected get allApps(): string[] {
    return APP_DEFS.map(a => a.type);
  }

  ngAfterViewInit(): void {
    this.setupScrollListener();
  }

  private setupScrollListener(): void {
    const container = this.scrollContainer?.nativeElement;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const index = Number((entry.target as HTMLElement).dataset['pageIndex']);
            if (!isNaN(index)) {
              this.currentPage.set(index);
            }
          }
        }
      },
      { root: container, threshold: 0.6 },
    );

    // Observe after a tick so the pages are rendered
    setTimeout(() => {
      this.pages.forEach((page) => observer.observe(page.nativeElement));
    }, 50);
  }

  protected scrollToPage(index: number): void {
    const pages = this.pages.toArray();
    if (pages[index]) {
      pages[index].nativeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    }
  }

  protected getPageLabel(index: number): string {
    const appType = this.allApps[index];
    return APP_DEFS.find((a) => a.type === appType)?.label ?? appType;
  }

  protected getPaletteColor(appType: string): string {
    return (this.palette?.colors as Record<string, string>)[appType] ?? '#1a6fa0';
  }

  protected getPaletteGradient(appType: string): string {
    return getPaletteGradient(this.palette, appType);
  }

  protected dotPages(): number[] {
    return Array.from({ length: this.allApps.length }, (_, i) => i);
  }
}
