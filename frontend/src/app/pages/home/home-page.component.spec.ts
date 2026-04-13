import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { HomePageComponent } from './home-page.component';
import { SessionStore } from '../../core/session/session.store';
import { QuoteApiService } from '../../core/services/quote-api.service';

describe('HomePageComponent', () => {
  let fixture: ComponentFixture<HomePageComponent>;
  let component: HomePageComponent;
  let router: Router;
  let isAuthSignal: ReturnType<typeof signal<boolean>>;
  let isAdminSignal: ReturnType<typeof signal<boolean>>;

  beforeEach(async () => {
    isAuthSignal = signal(false);
    isAdminSignal = signal(false);

    const sessionStoreMock = {
      isAuthenticated: isAuthSignal.asReadonly(),
      isAdmin: isAdminSignal.asReadonly(),
      clearSession: jasmine.createSpy('clearSession'),
    };

    const quoteApiMock = {
      getTodayQuote: () => of({ id: 1, quoteText: 'Test quote', attribution: 'Tester' }),
    };

    await TestBed.configureTestingModule({
      imports: [HomePageComponent, RouterTestingModule],
      providers: [
        { provide: SessionStore, useValue: sessionStoreMock },
        { provide: QuoteApiService, useValue: quoteApiMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePageComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    fixture.detectChanges();
  });

  it('routes to login when unauthenticated', () => {
    isAuthSignal.set(false);
    component['handleAuthCta']();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('routes to locker when authenticated', () => {
    isAuthSignal.set(true);
    component['handleAuthCta']();
    expect(router.navigate).toHaveBeenCalledWith(['/locker']);
  });

  it('clears session and navigates home on logout', () => {
    const sessionStore = TestBed.inject(SessionStore) as any;
    component['handleLogout']();
    expect(sessionStore.clearSession).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });
});
