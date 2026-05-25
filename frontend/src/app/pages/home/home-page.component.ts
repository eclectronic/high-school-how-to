import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteNavComponent } from '../../shared/site-nav/site-nav.component';
import { SocialLinksApiService } from '../../core/services/social-links-api.service';
import { HomeLayoutApiService } from '../../core/services/home-layout-api.service';
import { HomeSlotComponent } from './home-slot/home-slot.component';

type Attachment = 'tape' | 'pin-red' | 'pin-blue' | 'pin-green' | 'pin-yellow';

const ATTACHMENTS: Attachment[] = ['tape', 'tape', 'pin-red', 'pin-blue', 'pin-green', 'pin-yellow'];

function randomAttachment(): Attachment {
  return ATTACHMENTS[Math.floor(Math.random() * ATTACHMENTS.length)];
}

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [SiteNavComponent, HomeSlotComponent, RouterLink],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent implements OnInit {
  private readonly socialLinksApi = inject(SocialLinksApiService);
  private readonly homeLayoutApi = inject(HomeLayoutApiService);

  protected readonly sections = this.homeLayoutApi.sections;

  protected readonly attachments = {
    tagline: randomAttachment(),
    about: randomAttachment(),
    howto: randomAttachment(),
    locker: randomAttachment(),
  };

  protected pinClass(a: Attachment): string {
    return `card-pin card-pin--${a.replace('pin-', '')}`;
  }

  ngOnInit(): void {
    this.socialLinksApi.loadPublicLinks();
    this.homeLayoutApi.loadSections();
  }
}
