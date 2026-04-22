import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
  AfterViewInit
} from '@angular/core';
import { APP_CONFIG } from '../../../core/config/app-config';

declare const google: {
  accounts: {
    id: {
      initialize: (config: object) => void;
      renderButton: (element: HTMLElement, options: object) => void;
    };
  };
};

@Component({
  selector: 'app-google-button',
  standalone: true,
  template: `<div #container></div>`,
  styles: [':host { display: block; }']
})
export class GoogleButtonComponent implements AfterViewInit {
  @ViewChild('container') private containerRef!: ElementRef<HTMLElement>;

  @Input() nonce = '';
  @Output() idTokenReceived = new EventEmitter<string>();

  ngAfterViewInit() {
    if (typeof google !== 'undefined') {
      this.renderButton();
      return;
    }
    // GSI script loads async — poll until available (up to ~3s)
    let attempts = 0;
    const timer = setInterval(() => {
      if (typeof google !== 'undefined') {
        clearInterval(timer);
        this.renderButton();
      } else if (++attempts > 30) {
        clearInterval(timer);
      }
    }, 100);
  }

  private renderButton() {
    google.accounts.id.initialize({
      client_id: APP_CONFIG.googleClientId,
      callback: (response: { credential: string }) => {
        this.idTokenReceived.emit(response.credential);
      },
      nonce: this.nonce
    });
    google.accounts.id.renderButton(this.containerRef.nativeElement, {
      type: 'standard',
      shape: 'rectangular',
      theme: 'outline',
      text: 'signin_with',
      size: 'large',
      width: 280
    });
  }
}
