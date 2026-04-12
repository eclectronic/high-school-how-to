import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EarnedBadge, Badge } from '../../core/models/task.models';

@Component({
  selector: 'app-badge-shelf',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="badge-shelf">
      <h3 class="badge-shelf__title">My Badges</h3>

      @if (badges.length === 0) {
        <p class="badge-shelf__empty">
          Use features and complete checklists to earn badges!
        </p>
      } @else {
        <div class="badge-shelf__row">
          @for (eb of badges; track eb.id) {
            <div
              class="badge-item"
              [title]="eb.badge.name + (eb.badge.description ? ': ' + eb.badge.description : '')"
              (click)="togglePopover(eb)"
            >
              @if (eb.badge.iconUrl) {
                <img class="badge-item__icon" [src]="eb.badge.iconUrl" [alt]="eb.badge.name" />
              } @else {
                <span class="badge-item__emoji">{{ eb.badge.emoji }}</span>
              }
              <span class="badge-item__name">{{ eb.badge.name }}</span>

              @if (activePopover() === eb.id) {
                <div class="badge-popover" (click)="$event.stopPropagation()">
                  <button class="badge-popover__close" (click)="closePopover()">✕</button>
                  @if (eb.badge.iconUrl) {
                    <img class="badge-popover__icon" [src]="eb.badge.iconUrl" [alt]="eb.badge.name" />
                  } @else {
                    <span class="badge-popover__emoji">{{ eb.badge.emoji }}</span>
                  }
                  <div class="badge-popover__name">{{ eb.badge.name }}</div>
                  @if (eb.badge.description) {
                    <div class="badge-popover__desc">{{ eb.badge.description }}</div>
                  }
                  <div class="badge-popover__date">
                    Earned {{ eb.earnedAt | date: 'mediumDate' }}
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .badge-shelf {
      padding: 0.75rem 1rem;
    }
    .badge-shelf__title {
      font-size: 0.85rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0 0 0.5rem;
      opacity: 0.75;
    }
    .badge-shelf__empty {
      font-size: 0.85rem;
      opacity: 0.6;
      margin: 0;
    }
    .badge-shelf__row {
      display: flex;
      gap: 0.75rem;
      overflow-x: auto;
      padding-bottom: 0.25rem;
    }
    .badge-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      position: relative;
      flex-shrink: 0;
      width: 56px;
    }
    .badge-item__icon {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      object-fit: cover;
    }
    .badge-item__emoji {
      font-size: 2.5rem;
      line-height: 1;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .badge-item__name {
      font-size: 0.65rem;
      text-align: center;
      max-width: 56px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-top: 0.2rem;
      opacity: 0.85;
    }
    .badge-popover {
      position: absolute;
      top: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      background: #fff;
      color: #1c1c1e;
      border-radius: 10px;
      padding: 1rem;
      box-shadow: 0 4px 24px rgba(0,0,0,0.18);
      z-index: 100;
      width: 200px;
      text-align: center;
    }
    .badge-popover__close {
      position: absolute;
      top: 0.4rem;
      right: 0.4rem;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 0.8rem;
      opacity: 0.5;
    }
    .badge-popover__icon {
      width: 56px;
      height: 56px;
      border-radius: 8px;
      margin-bottom: 0.5rem;
    }
    .badge-popover__emoji {
      font-size: 3rem;
      display: block;
      margin-bottom: 0.25rem;
    }
    .badge-popover__name {
      font-weight: 600;
      margin-bottom: 0.25rem;
    }
    .badge-popover__desc {
      font-size: 0.82rem;
      color: #555;
      margin-bottom: 0.5rem;
    }
    .badge-popover__date {
      font-size: 0.78rem;
      color: #888;
    }
  `],
})
export class BadgeShelfComponent {
  @Input() badges: EarnedBadge[] = [];

  protected activePopover = signal<number | null>(null);

  protected togglePopover(eb: EarnedBadge) {
    this.activePopover.update((cur) => (cur === eb.id ? null : eb.id));
  }

  protected closePopover() {
    this.activePopover.set(null);
  }
}
