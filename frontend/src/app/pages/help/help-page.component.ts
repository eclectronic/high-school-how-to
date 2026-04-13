import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContentApiService } from '../../core/services/content-api.service';
import { ContentCard } from '../../core/models/content.models';
import { SiteNavComponent } from '../../shared/site-nav/site-nav.component';

@Component({
  selector: 'app-help-page',
  standalone: true,
  imports: [RouterLink, SiteNavComponent],
  templateUrl: './help-page.component.html',
  styleUrl: './help-page.component.scss',
})
export class HelpPageComponent implements OnInit {
  private readonly api = inject(ContentApiService);

  protected readonly loading = signal(true);
  protected readonly articles = signal<ContentCard[]>([]);

  ngOnInit(): void {
    this.api.getCardsByTag('help').subscribe({
      next: (cards) => {
        this.articles.set(cards);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
