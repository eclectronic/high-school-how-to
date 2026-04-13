import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { LockerShellComponent } from './locker-shell.component';
import { AppPreferencesApiService } from '../../core/services/app-preferences-api.service';

const stubPreferences = {
  activeApps: ['TODO', 'NOTES', 'TIMER'],
  paneOrder: null,
  paletteName: 'ocean',
  lockerColor: null,
  fontFamily: null,
};

describe('LockerShellComponent', () => {
  let fixture: ComponentFixture<LockerShellComponent>;
  let component: LockerShellComponent;
  let preferencesApiSpy: jasmine.SpyObj<AppPreferencesApiService>;

  beforeEach(async () => {
    preferencesApiSpy = jasmine.createSpyObj('AppPreferencesApiService', [
      'getPreferences',
      'updatePreferences',
    ]);
    preferencesApiSpy.getPreferences.and.returnValue(of(stubPreferences));
    preferencesApiSpy.updatePreferences.and.returnValue(of(stubPreferences));

    await TestBed.configureTestingModule({
      imports: [LockerShellComponent, RouterTestingModule],
      providers: [
        { provide: AppPreferencesApiService, useValue: preferencesApiSpy },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(LockerShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  describe('keyboard shortcut: n', () => {
    it('increments createNewItemSignal', () => {
      (component as any).isMobile.set(false);
      const before = (component as any).createNewItemSignal();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', bubbles: true }));
      expect((component as any).createNewItemSignal()).toBe(before + 1);
    });
  });

  describe('keyboard shortcuts ignored when focus is in an INPUT', () => {
    it('does not increment createNewItemSignal when event target is an INPUT', () => {
      (component as any).isMobile.set(false);
      const inputEl = document.createElement('input');
      document.body.appendChild(inputEl);

      const before = (component as any).createNewItemSignal();
      const event = new KeyboardEvent('keydown', { key: 'n', bubbles: true });
      Object.defineProperty(event, 'target', { value: inputEl, configurable: true });
      document.dispatchEvent(event);

      expect((component as any).createNewItemSignal()).toBe(before);
      document.body.removeChild(inputEl);
    });
  });

  describe('keyboard shortcuts ignored on mobile', () => {
    it('does not increment createNewItemSignal when isMobile is true', () => {
      (component as any).isMobile.set(true);
      const before = (component as any).createNewItemSignal();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', bubbles: true }));
      expect((component as any).createNewItemSignal()).toBe(before);
    });
  });
});
