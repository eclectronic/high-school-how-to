import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { HomePageComponent } from './home-page.component';
import { SessionStore } from '../../core/session/session.store';
import { ContentApiService } from '../../core/services/content-api.service';

describe('HomePageComponent', () => {
  let fixture: ComponentFixture<HomePageComponent>;
  let component: HomePageComponent;
  let router: Router;
  let isAuthSignal: ReturnType<typeof signal<boolean>>;
  let isAdminSignal: ReturnType<typeof signal<boolean>>;
  let contentApi: jasmine.SpyObj<ContentApiService>;

  beforeEach(async () => {
    isAuthSignal = signal(false);
    isAdminSignal = signal(false);

    const sessionStoreMock = {
      isAuthenticated: isAuthSignal.asReadonly(),
      isAdmin: isAdminSignal.asReadonly(),
      clearSession: jasmine.createSpy('clearSession'),
    };

    contentApi = jasmine.createSpyObj<ContentApiService>('ContentApiService', [
      'getHomeLayout',
    ]);
    contentApi.getHomeLayout.and.returnValue(of({ featuredCard: null, sections: [] }));

    await TestBed.configureTestingModule({
      imports: [HomePageComponent, RouterTestingModule],
      providers: [
        { provide: SessionStore, useValue: sessionStoreMock },
        { provide: ContentApiService, useValue: contentApi },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePageComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    fixture.detectChanges();
  });

  it('loads layout on init', () => {
    expect(contentApi.getHomeLayout).toHaveBeenCalled();
  });

  it('routes to login when unauthenticated', () => {
    isAuthSignal.set(false);
    component['handleAuthCta']();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('routes to dashboard when authenticated', () => {
    isAuthSignal.set(true);
    component['handleAuthCta']();
    expect(router.navigate).toHaveBeenCalledWith(['/account/locker']);
  });

  it('derives youtube thumbnail from video media url', () => {
    const card: any = {
      thumbnailUrl: null,
      cardType: 'VIDEO',
      mediaUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    };
    const thumb = component['cardThumbnail'](card);
    expect(thumb).toContain('dQw4w9WgXcQ');
  });

  it('returns null thumbnail when no thumbnailUrl and non-video card', () => {
    const card: any = { thumbnailUrl: null, cardType: 'ARTICLE', mediaUrl: null };
    expect(component['cardThumbnail'](card)).toBeNull();
  });
});
