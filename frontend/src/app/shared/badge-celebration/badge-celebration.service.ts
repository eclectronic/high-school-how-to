import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { EarnedBadge } from '../../core/models/task.models';

/**
 * Service that broadcasts earned-badge events to the celebration modal.
 * Call `notify(earnedBadge)` whenever an API response contains an
 * `earnedBadge` field, to trigger the celebration overlay once per badge.
 */
@Injectable({ providedIn: 'root' })
export class BadgeCelebrationService {
  private readonly _badge$ = new Subject<EarnedBadge>();
  readonly badge$ = this._badge$.asObservable();

  private readonly shown = new Set<number>();

  /** Show the celebration modal for the given badge if not already shown. */
  notify(badge: EarnedBadge | null | undefined): void {
    if (!badge) return;
    if (this.shown.has(badge.id)) return;
    this.shown.add(badge.id);
    this._badge$.next(badge);
  }
}
