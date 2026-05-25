import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { HomePageComponent } from './home-page.component';
import { SocialLinksApiService } from '../../core/services/social-links-api.service';
import { HomeLayoutApiService } from '../../core/services/home-layout-api.service';
import { ContentApiService } from '../../core/services/content-api.service';
import { of } from 'rxjs';

describe('HomePageComponent', () => {
  let fixture: ComponentFixture<HomePageComponent>;
  let component: HomePageComponent;
  let loadPublicLinksSpy: jasmine.Spy;
  let loadSectionsSpy: jasmine.Spy;

  beforeEach(async () => {
    loadPublicLinksSpy = jasmine.createSpy('loadPublicLinks');
    const socialLinksApiMock = {
      links: signal([]).asReadonly(),
      loadPublicLinks: loadPublicLinksSpy,
    };

    loadSectionsSpy = jasmine.createSpy('loadSections');
    const homeLayoutApiMock = {
      sections: signal([]).asReadonly(),
      loadSections: loadSectionsSpy,
    };

    const contentApiMock = {
      getCardsByTag: () => of([]),
    };

    await TestBed.configureTestingModule({
      imports: [HomePageComponent, RouterTestingModule],
      providers: [
        { provide: SocialLinksApiService, useValue: socialLinksApiMock },
        { provide: HomeLayoutApiService, useValue: homeLayoutApiMock },
        { provide: ContentApiService, useValue: contentApiMock },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('loads social links on init', () => {
    expect(loadPublicLinksSpy).toHaveBeenCalled();
  });

  it('loads home layout sections on init', () => {
    expect(loadSectionsSpy).toHaveBeenCalled();
  });

  it('renders no dynamic slots when sections signal is empty', () => {
    const slots = fixture.nativeElement.querySelectorAll('app-home-slot');
    // Only the hero's "about" slot remains when sections() is empty
    expect(slots.length).toBe(1);
  });
});
