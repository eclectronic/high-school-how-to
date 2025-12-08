import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import {
  YoutubeVideoResource,
  buildYoutubeEmbedUrl,
  youtubeVideos
} from '../../resources/youtube-videos';

@Component({
  selector: 'app-youtube-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './youtube-viewer.component.html',
  styleUrl: './youtube-viewer.component.scss'
})
export class YoutubeViewerComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);

  protected video?: YoutubeVideoResource;
  protected embedUrl?: SafeResourceUrl;

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    this.video = youtubeVideos.find((item) => item.slug === slug);

    if (!this.video) {
      void this.router.navigateByUrl('/');
      return;
    }

    this.embedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      buildYoutubeEmbedUrl(this.video.url)
    );
  }

  protected handleBack(slug: string): void {
    void this.router.navigate(['/'], { fragment: `video-${slug}` });
  }

  @HostListener('document:keydown.escape', ['$event'])
  protected handleEscape(event: Event): void {
    event.preventDefault();
    const slug = this.video?.slug;
    if (slug) {
      this.handleBack(slug);
    }
  }
}
