import { Directive, ElementRef, HostListener, inject } from '@angular/core';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

@Directive({
  selector: '[appPaneFocusTrap]',
  standalone: true,
})
export class PaneFocusTrapDirective {
  private readonly el = inject(ElementRef<HTMLElement>);

  @HostListener('keydown.tab', ['$event'])
  onTab(event: Event): void { this.trap(event as KeyboardEvent, false); }

  @HostListener('keydown.shift.tab', ['$event'])
  onShiftTab(event: Event): void { this.trap(event as KeyboardEvent, true); }

  private trap(event: KeyboardEvent, reverse: boolean): void {
    const focusable = this.focusableElements();
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (reverse) {
      if (active === first) { event.preventDefault(); last.focus(); }
    } else {
      if (active === last)  { event.preventDefault(); first.focus(); }
    }
  }

  private focusableElements(): HTMLElement[] {
    return Array.from(this.el.nativeElement.querySelectorAll(FOCUSABLE))
      .filter((el): el is HTMLElement => (el as HTMLElement).offsetParent !== null);
  }
}
