import { DOCUMENT } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { EditModeBannerComponent } from './shared/edit-mode-banner/edit-mode-banner.component';
import { EditModeBarComponent } from './shared/edit-mode-bar/edit-mode-bar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, EditModeBannerComponent, EditModeBarComponent],
  template: `
    <app-edit-mode-banner></app-edit-mode-banner>
    <router-outlet></router-outlet>
    <app-edit-mode-bar></app-edit-mode-bar>
  `,
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('highschoolhowto');
  private readonly document = inject(DOCUMENT);
  private readonly baseTileSize = 256;
  private cleanupFns: Array<() => void> = [];

  ngOnInit(): void {
    this.updateTileSize();

    if (typeof window === 'undefined') {
      return;
    }

    const update = () => this.updateTileSize();

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', update);
      window.visualViewport.addEventListener('scroll', update);
      this.cleanupFns.push(() => window.visualViewport?.removeEventListener('resize', update));
      this.cleanupFns.push(() => window.visualViewport?.removeEventListener('scroll', update));
    } else {
      window.addEventListener('resize', update);
      this.cleanupFns.push(() => window.removeEventListener('resize', update));
    }
  }

  ngOnDestroy(): void {
    for (const cleanup of this.cleanupFns) {
      cleanup();
    }
    this.cleanupFns = [];
  }

  private updateTileSize(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const scale = window.visualViewport?.scale ?? window.devicePixelRatio ?? 1;
    const adjustedSize = this.baseTileSize / (scale || 1);
    const root = this.document?.documentElement;

    if (root) {
      root.style.setProperty('--bg-tile-size', `${adjustedSize}px`);
    }
  }
}
