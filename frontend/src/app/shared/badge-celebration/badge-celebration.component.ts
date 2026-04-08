import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BadgeCelebrationService } from './badge-celebration.service';
import { EarnedBadge } from '../../core/models/task.models';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-badge-celebration',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (earnedBadge()) {
      <div class="badge-modal-overlay" (click)="dismiss()">
        <div class="badge-modal" (click)="$event.stopPropagation()">
          <div class="badge-modal__headline">🎉 Badge Earned!</div>

          @if (earnedBadge()!.badge.iconUrl) {
            <img
              class="badge-modal__icon"
              [src]="earnedBadge()!.badge.iconUrl"
              [alt]="earnedBadge()!.badge.name"
            />
          } @else {
            <div class="badge-modal__emoji">{{ earnedBadge()!.badge.emoji }}</div>
          }

          <div class="badge-modal__name">{{ earnedBadge()!.badge.name }}</div>

          @if (earnedBadge()!.badge.description) {
            <div class="badge-modal__desc">{{ earnedBadge()!.badge.description }}</div>
          }

          <button class="btn btn--primary badge-modal__btn" (click)="dismiss()">
            Awesome!
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    .badge-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .badge-modal {
      background: #fff;
      border-radius: 16px;
      padding: 2rem 1.5rem;
      max-width: 320px;
      width: 90%;
      text-align: center;
      box-shadow: 0 8px 40px rgba(0,0,0,0.2);
      animation: slideUp 0.25s ease;
    }
    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .badge-modal__headline {
      font-size: 1.25rem;
      font-weight: 700;
      margin-bottom: 1rem;
      color: #1c1c1e;
    }
    .badge-modal__icon {
      width: 72px;
      height: 72px;
      border-radius: 12px;
      margin: 0 auto 0.75rem;
      display: block;
    }
    .badge-modal__emoji {
      font-size: 4rem;
      margin-bottom: 0.5rem;
    }
    .badge-modal__name {
      font-size: 1.1rem;
      font-weight: 600;
      color: #1c1c1e;
      margin-bottom: 0.5rem;
    }
    .badge-modal__desc {
      font-size: 0.9rem;
      color: #555;
      margin-bottom: 1.25rem;
      line-height: 1.4;
    }
    .badge-modal__btn {
      width: 100%;
    }
  `],
})
export class BadgeCelebrationComponent implements OnInit, OnDestroy {
  private readonly celebrationService = inject(BadgeCelebrationService);

  protected earnedBadge = signal<EarnedBadge | null>(null);

  private sub?: Subscription;

  ngOnInit() {
    this.sub = this.celebrationService.badge$.subscribe((badge) => {
      this.earnedBadge.set(badge);
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  protected dismiss() {
    this.earnedBadge.set(null);
  }
}
