import { Component, Input, OnInit, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { ContentApiService } from '../../../core/services/content-api.service';
import { ContentCard, MediaUrlEntry } from '../../../core/models/content.models';

@Component({
  selector: 'app-home-slot',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home-slot.component.html',
  styleUrl: './home-slot.component.scss',
})
export class HomeSlotComponent implements OnInit {
  @Input({ required: true }) slotTag!: string;
  @Input() titleLink: string | null = null;

  private readonly api = inject(ContentApiService);
  private readonly sanitizer = inject(DomSanitizer);

  protected card = signal<ContentCard | null>(null);
  protected safeHtml = signal<SafeHtml | null>(null);

  protected readonly safeEmbed = computed((): SafeResourceUrl | null => {
    const c = this.card();
    if (!c || c.cardType !== 'VIDEO' || !c.mediaUrl) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.buildEmbedUrl(c.mediaUrl));
  });

  protected readonly mediaUrls = computed((): MediaUrlEntry[] => {
    const card = this.card();
    if (!card || card.cardType !== 'INFOGRAPHIC') return [];
    if (card.mediaUrls?.length) return card.mediaUrls;
    if (card.mediaUrl) return [{ url: card.mediaUrl, printUrl: null, alt: null }];
    return [];
  });

  ngOnInit(): void {
    this.api.getCardsByTag(this.slotTag).subscribe({
      next: (cards) => {
        if (!cards.length) return;
        const first = cards[0];
        this.card.set(first);
        if (first.cardType === 'ARTICLE' && first.bodyHtml) {
          this.safeHtml.set(this.sanitizer.bypassSecurityTrustHtml(first.bodyHtml));
        }
      },
      error: () => {},
    });
  }

  private buildEmbedUrl(url: string): string {
    const match = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
    return url;
  }
}
