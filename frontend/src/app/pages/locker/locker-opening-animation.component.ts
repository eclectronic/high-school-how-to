import { Component, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-locker-opening-animation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './locker-opening-animation.component.html',
  styleUrl: './locker-opening-animation.component.scss',
})
export class LockerOpeningAnimationComponent implements OnInit {
  /** The gradient string for the locker door (from the active palette). */
  @Input() doorGradient = 'linear-gradient(135deg, #6aabdf 0%, #1a7ac8 45%, #1458a0 100%)';

  @Output() done = new EventEmitter<void>();

  protected isOpening = signal(false);
  protected isFading = signal(false);

  ngOnInit(): void {
    // Dial spin plays immediately via CSS (animation auto-starts on render).
    // After 1300ms (dial spin duration), trigger the door swing.
    setTimeout(() => {
      this.isOpening.set(true);

      // Door swing lasts 900ms, then fade out.
      setTimeout(() => {
        this.isFading.set(true);

        // Fade takes 400ms, then emit done to remove the overlay.
        setTimeout(() => {
          this.done.emit();
        }, 400);
      }, 900);
    }, 1300);
  }
}
