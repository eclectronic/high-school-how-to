import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SecurityContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { HomePageComponent } from './home-page.component';
import { SessionStore } from '../../core/session/session.store';
import { youtubeVideos } from '../../resources/youtube-videos';

// Verifies homepage carousel state changes, embed sanitization, and auth CTA routing.

describe('HomePageComponent', () => {
  let fixture: ComponentFixture<HomePageComponent>;
  let component: HomePageComponent;
  let router: Router;
  let navigateSpy: jasmine.Spy;
  let sanitizer: DomSanitizer;
  let sessionStore: jasmine.SpyObj<SessionStore>;

  beforeEach(async () => {
    // RouterTestingModule provides Router and ActivatedRoute for RouterLink usage
    sessionStore = jasmine.createSpyObj<SessionStore>('SessionStore', ['isAuthenticated']);
    sessionStore.isAuthenticated.and.returnValue(false);

    await TestBed.configureTestingModule({
      imports: [HomePageComponent, RouterTestingModule],
      providers: [{ provide: SessionStore, useValue: sessionStore }]
    }).compileComponents();

    fixture = TestBed.createComponent(HomePageComponent);
    component = fixture.componentInstance;
    sanitizer = TestBed.inject(DomSanitizer);
    router = TestBed.inject(Router);
    navigateSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    fixture.detectChanges();
  });

  it('builds an embed url for the featured video on init', () => {
    const expectedId = youtubeVideos[0].url.split('v=')[1];
    const sanitized = sanitizer.sanitize(
      SecurityContext.RESOURCE_URL,
      component['featuredVideoEmbed'] as any
    );
    expect(sanitized).toContain(expectedId);
  });

  it('steps through videos and wraps around', () => {
    const initialSlug = component['featuredVideo'].slug;
    component['stepVideo'](1);
    const nextSlug = component['featuredVideo'].slug;

    component['stepVideo'](-1);
    const wrappedSlug = component['featuredVideo'].slug;

    expect(nextSlug).not.toEqual(initialSlug);
    expect(wrappedSlug).toEqual(initialSlug);
  });

  it('routes to login when unauthenticated and to account when authenticated', () => {
    sessionStore.isAuthenticated.and.returnValue(false);
    component['handleAuthCta']();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);

    navigateSpy.calls.reset();
    sessionStore.isAuthenticated.and.returnValue(true);
    component['handleAuthCta']();
    expect(router.navigate).toHaveBeenCalledWith(['/account/dashboard']);
  });
});
