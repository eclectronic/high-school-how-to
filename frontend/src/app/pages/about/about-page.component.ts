import { Component, OnInit, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ContentApiService } from '../../core/services/content-api.service';
import { SiteNavComponent } from '../../shared/site-nav/site-nav.component';

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
  protected readonly bodyHtml = signal<SafeHtml | null>(null);
  protected readonly title = signal<string>('About');

  ngOnInit(): void {
    this.api.getCardsByTag('about').subscribe({
      next: (cards) => {
        const first = cards[0];
        if (first) {
          this.title.set(first.title);
          if (first.bodyHtml) {
            this.bodyHtml.set(this.sanitizer.bypassSecurityTrustHtml(first.bodyHtml));
          }
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
