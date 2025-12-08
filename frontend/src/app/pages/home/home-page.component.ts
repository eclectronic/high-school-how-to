import { NgIf } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { InfographicResource, infographics } from '../../resources/infographics';
import {
  YoutubeVideoResource,
  buildYoutubeEmbedUrl,
  youtubeVideos
} from '../../resources/youtube-videos';
import { SessionStore } from '../../core/session/session.store';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [NgIf],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss'
})
export class HomePageComponent implements OnInit {
  protected readonly youtubeVideoResources = youtubeVideos;
  protected readonly infographicResources = infographics;
  protected videoIndex = 0;
  protected infographicIndex = 0;
  protected featuredVideo: YoutubeVideoResource = youtubeVideos[0];
  protected featuredVideoEmbed?: SafeResourceUrl;
  protected featuredInfographic: InfographicResource = infographics[0];
  private readonly sanitizer = inject(DomSanitizer);
  private readonly router = inject(Router);
  private readonly sessionStore = inject(SessionStore);
  protected readonly isAuthenticated = this.sessionStore.isAuthenticated;
  private videoTouchStart: number | null = null;
  private infographicTouchStart: number | null = null;

  ngOnInit(): void {
    this.updateFeaturedVideoEmbed();
  }

  protected stepVideo(delta: number): void {
    this.videoIndex = (this.videoIndex + delta + this.youtubeVideoResources.length) % this.youtubeVideoResources.length;
    this.featuredVideo = this.youtubeVideoResources[this.videoIndex];
    this.updateFeaturedVideoEmbed();
  }

  protected stepInfographic(delta: number): void {
    this.infographicIndex =
      (this.infographicIndex + delta + this.infographicResources.length) % this.infographicResources.length;
    this.featuredInfographic = this.infographicResources[this.infographicIndex];
  }

  protected handleVideoPointerStart(event: PointerEvent): void {
    if (event.pointerType === 'touch') {
      this.videoTouchStart = event.clientX;
    }
  }

  protected handleVideoPointerEnd(event: PointerEvent): void {
    if (event.pointerType === 'touch' && this.videoTouchStart !== null) {
      const delta = event.clientX - this.videoTouchStart;
      if (Math.abs(delta) > 40) {
        this.stepVideo(delta < 0 ? 1 : -1);
      }
    }
    this.videoTouchStart = null;
  }

  protected handleInfographicPointerStart(event: PointerEvent): void {
    if (event.pointerType === 'touch') {
      this.infographicTouchStart = event.clientX;
    }
  }

  protected handleInfographicPointerEnd(event: PointerEvent): void {
    if (event.pointerType === 'touch' && this.infographicTouchStart !== null) {
      const delta = event.clientX - this.infographicTouchStart;
      if (Math.abs(delta) > 40) {
        this.stepInfographic(delta < 0 ? 1 : -1);
      }
    }
    this.infographicTouchStart = null;
  }

  private updateFeaturedVideoEmbed(autoplay = false): void {
    const url = buildYoutubeEmbedUrl(this.featuredVideo.url, autoplay);
    this.featuredVideoEmbed = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  protected handleAuthCta(): void {
    if (this.isAuthenticated()) {
      this.router.navigate(['/account/security']);
      return;
    }
    this.router.navigate(['/auth/login']);
  }
}
