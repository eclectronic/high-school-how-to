import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContentApiService } from '../../core/services/content-api.service';
import { ContentCard } from '../../core/models/content.models';
import { SiteNavComponent } from '../../shared/site-nav/site-nav.component';

const PIN_PALETTE = [
  'radial-gradient(circle at 38% 35%, #ff7070, #b91c1c)',
  'radial-gradient(circle at 38% 35%, #60a5fa, #1d4ed8)',
  'radial-gradient(circle at 38% 35%, #4ade80, #15803d)',
  'radial-gradient(circle at 38% 35%, #fcd34d, #a16207)',
  'radial-gradient(circle at 38% 35%, #c084fc, #7e22ce)',
  'radial-gradient(circle at 38% 35%, #fb923c, #c2410c)',
  'radial-gradient(circle at 38% 35%, #f472b6, #be185d)',
  'radial-gradient(circle at 38% 35%, #2dd4bf, #0f766e)',
  'radial-gradient(circle at 38% 35%, #818cf8, #3730a3)',
  'radial-gradient(circle at 38% 35%, #a3e635, #4d7c0f)',
];

const POSTIT_PALETTE = [
  '#fff176', // yellow
  '#ffcc80', // orange
  '#f48fb1', // pink
  '#ce93d8', // purple
  '#80deea', // cyan
  '#a5d6a7', // green
  '#90caf9', // blue
  '#ffab91', // coral
  '#b0bec5', // slate
  '#fff59d', // pale yellow
];

const ROTATIONS = [-2, 1, -1, 2, 0, -1.5, 1.5, -2.5, 0.5, -0.5];

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

  /** Random offset shifts the pin palette on every page load. */
  private readonly paletteOffset = Math.floor(Math.random() * PIN_PALETTE.length);

  protected cardColor(index: number, card: ContentCard): string {
    if (card.backgroundColor) return card.backgroundColor;
    return POSTIT_PALETTE[index % POSTIT_PALETTE.length];
  }

  protected cardRotation(index: number): number {
    return ROTATIONS[index % ROTATIONS.length];
  }

  protected pinBackground(index: number): string {
    return PIN_PALETTE[(index + this.paletteOffset) % PIN_PALETTE.length];
  }

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
