import { Component, Input, Output, EventEmitter, OnInit, signal, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { ContentApiService } from '../../core/services/content-api.service';
import { ContentCard } from '../../core/models/content.models';

@Component({
  selector: 'app-help-overlay',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="help-overlay__backdrop" (click)="closed.emit()"></div>
    <div class="help-overlay__panel" role="dialog" aria-modal="true" [attr.aria-label]="card()?.title ?? 'Help'" [style.font-family]="fontFamily || null">
      <div class="help-overlay__header">
        <span class="help-overlay__title">{{ card()?.title ?? '' }}</span>
        <div class="help-overlay__header-actions">
          <a
            class="help-overlay__full-link"
            [routerLink]="['/content', slug]"
            [queryParams]="{ tag: 'help' }"
            (click)="closed.emit()"
            title="Open full article"
          >Full article →</a>
          <button type="button" class="help-overlay__close" (click)="closed.emit()" aria-label="Close help">✕</button>
        </div>
      </div>

      <div class="help-overlay__body">
        @if (loading()) {
          <p class="help-overlay__loading">Loading…</p>
        } @else if (error()) {
          <p class="help-overlay__error">Could not load help content.</p>
        } @else if (card()) {
          @if (card()!.cardType === 'ARTICLE' && safeHtml()) {
            <div class="help-overlay__article" [innerHTML]="safeHtml()!"></div>
          } @else if (card()!.cardType === 'INFOGRAPHIC' && card()!.mediaUrls.length > 0) {
            @for (entry of card()!.mediaUrls; track $index) {
              <img class="help-overlay__image" [src]="entry.url" [alt]="entry.alt ?? card()!.title" />
            }
          } @else if (card()!.description) {
            <p>{{ card()!.description }}</p>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .help-overlay__backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
    }

    .help-overlay__panel {
      position: relative;
      background: #fffef8;
      border-radius: 1rem;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3);
      width: min(640px, 92vw);
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;

      @media (max-width: 480px) {
        width: 100vw;
        max-height: 100dvh;
        border-radius: 0;
        position: fixed;
        inset: 0;
      }
    }

    .help-overlay__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.9rem 1.1rem 0.9rem 1.25rem;
      border-bottom: 1px solid rgba(45, 26, 16, 0.1);
      flex-shrink: 0;
    }

    .help-overlay__title {
      font-size: 1rem;
      font-weight: 700;
      color: #2d1a10;
    }

    .help-overlay__header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-shrink: 0;
    }

    .help-overlay__full-link {
      font-size: 0.78rem;
      color: #1a6fa0;
      text-decoration: none;
      white-space: nowrap;

      &:hover { text-decoration: underline; }
    }

    .help-overlay__close {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 0.9rem;
      color: rgba(45, 26, 16, 0.5);
      padding: 0.2rem 0.3rem;
      border-radius: 4px;
      transition: color 0.12s, background 0.12s;

      &:hover {
        color: #2d1a10;
        background: rgba(45, 26, 16, 0.08);
      }
    }

    .help-overlay__body {
      overflow-y: auto;
      padding: 1.25rem;
      flex: 1;
    }

    .help-overlay__loading,
    .help-overlay__error {
      color: rgba(45, 26, 16, 0.5);
      font-style: italic;
    }

    .help-overlay__article {
      font-size: 0.9rem;
      line-height: 1.65;
      color: #2d1a10;

      :global(h1), :global(h2), :global(h3) { margin: 1em 0 0.4em; font-weight: 700; }
      :global(p) { margin: 0 0 0.75em; }
      :global(ul), :global(ol) { margin: 0 0 0.75em 1.25em; }
      :global(li) { margin-bottom: 0.3em; }
      :global(strong) { font-weight: 700; }
    }

    .help-overlay__image {
      max-width: 100%;
      border-radius: 0.5rem;
      display: block;
      margin: 0 auto 1rem;
    }
  `],
})
export class HelpOverlayComponent implements OnInit {
  @Input({ required: true }) slug!: string;
  @Input() fontFamily: string | null = null;
  @Output() closed = new EventEmitter<void>();

  private readonly api = inject(ContentApiService);
  private readonly sanitizer = inject(DomSanitizer);

  protected card = signal<ContentCard | null>(null);
  protected safeHtml = signal<SafeHtml | null>(null);
  protected loading = signal(true);
  protected error = signal(false);

  @HostListener('document:keydown.escape')
  onEscape(): void { this.closed.emit(); }

  ngOnInit(): void {
    this.api.getCardBySlug(this.slug).subscribe({
      next: (card) => {
        this.card.set(card);
        if (card.bodyHtml) {
          this.safeHtml.set(this.sanitizer.bypassSecurityTrustHtml(card.bodyHtml));
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
