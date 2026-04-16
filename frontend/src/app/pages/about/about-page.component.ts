import { Component, OnInit, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ContentApiService } from '../../core/services/content-api.service';
import { ContentCard } from '../../core/models/content.models';
import { SiteNavComponent } from '../../shared/site-nav/site-nav.component';

const ABOUT_DEFAULT_COLOR = '#fff176';

@Component({
  selector: 'app-about-page',
  standalone: true,
  imports: [SiteNavComponent],
  templateUrl: './about-page.component.html',
  styleUrl: './about-page.component.scss',
})
export class AboutPageComponent implements OnInit {
  private readonly api = inject(ContentApiService);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly loading = signal(true);
  protected readonly card = signal<ContentCard | null>(null);
  protected readonly bodyHtml = signal<SafeHtml | null>(null);

  protected get postitColor(): string {
    return this.card()?.backgroundColor || ABOUT_DEFAULT_COLOR;
  }

  ngOnInit(): void {
    this.api.getCardsByTag('about').subscribe({
      next: (cards) => {
        const first = cards[0] ?? null;
        this.card.set(first);
        if (first?.bodyHtml) {
          this.bodyHtml.set(this.sanitizer.bypassSecurityTrustHtml(first.bodyHtml));
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
