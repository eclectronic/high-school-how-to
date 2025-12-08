import { DOCUMENT } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>'
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
