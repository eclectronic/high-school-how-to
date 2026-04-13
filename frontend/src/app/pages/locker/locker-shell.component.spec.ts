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

  describe('keyboard shortcut: e', () => {
    it('calls toggleEditMode', () => {
      spyOn(component as any, 'toggleEditMode').and.callThrough();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', bubbles: true }));
      expect((component as any).toggleEditMode).toHaveBeenCalled();
    });
  });

  describe('keyboard shortcut: Escape', () => {
    it('calls goBack', () => {
      spyOn(component as any, 'goBack').and.callThrough();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect((component as any).goBack).toHaveBeenCalled();
    });
  });

  describe('keyboard shortcuts ignored when focus is in an INPUT', () => {
    it('does not call toggleEditMode when event target is an INPUT', () => {
      spyOn(component as any, 'toggleEditMode');
      const inputEl = document.createElement('input');
      document.body.appendChild(inputEl);
      inputEl.focus();

      const event = new KeyboardEvent('keydown', { key: 'e', bubbles: true });
      Object.defineProperty(event, 'target', { value: inputEl, configurable: true });
      document.dispatchEvent(event);

      expect((component as any).toggleEditMode).not.toHaveBeenCalled();
      document.body.removeChild(inputEl);
    });

  });

  describe('keyboard shortcuts ignored on mobile', () => {
    it('does not call toggleEditMode when isMobile is true', () => {
      (component as any).isMobile.set(true);
      spyOn(component as any, 'toggleEditMode');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', bubbles: true }));
      expect((component as any).toggleEditMode).not.toHaveBeenCalled();
    });

    it('does not call goBack when isMobile is true', () => {
      (component as any).isMobile.set(true);
      spyOn(component as any, 'goBack');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect((component as any).goBack).not.toHaveBeenCalled();
    });
  });
});
