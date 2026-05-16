import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { EditModeBannerComponent } from './edit-mode-banner.component';
import { EditModeStore } from '../../core/edit-mode/edit-mode.store';
import { SessionStore } from '../../core/session/session.store';

describe('EditModeBannerComponent', () => {
  let fixture: ComponentFixture<EditModeBannerComponent>;
  let isAdminSignal: ReturnType<typeof signal<boolean>>;
  let enabledSignal: ReturnType<typeof signal<boolean>>;

  beforeEach(async () => {
    isAdminSignal = signal(false);
    enabledSignal = signal(false);

    const sessionStoreMock = {
      isAdmin: isAdminSignal.asReadonly(),
    };

    const editModeStoreMock = {
      enabled: enabledSignal.asReadonly(),
    };

    await TestBed.configureTestingModule({
      imports: [EditModeBannerComponent],
      providers: [
        { provide: SessionStore, useValue: sessionStoreMock },
        { provide: EditModeStore, useValue: editModeStoreMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EditModeBannerComponent);
  });

  it('is hidden when editMode is false (even if admin)', () => {
    isAdminSignal.set(true);
    enabledSignal.set(false);
    fixture.detectChanges();
    const banner = fixture.nativeElement.querySelector('.edit-mode-banner');
    expect(banner).toBeNull();
  });

  it('is hidden when user is not admin (even if editMode enabled)', () => {
    isAdminSignal.set(false);
    enabledSignal.set(true);
    fixture.detectChanges();
    const banner = fixture.nativeElement.querySelector('.edit-mode-banner');
    expect(banner).toBeNull();
  });

  it('is hidden when both isAdmin and editMode are false', () => {
    isAdminSignal.set(false);
    enabledSignal.set(false);
    fixture.detectChanges();
    const banner = fixture.nativeElement.querySelector('.edit-mode-banner');
    expect(banner).toBeNull();
  });

  it('is visible when isAdmin() and editMode.enabled() are both true', () => {
    isAdminSignal.set(true);
    enabledSignal.set(true);
    fixture.detectChanges();
    const banner = fixture.nativeElement.querySelector('.edit-mode-banner');
    expect(banner).not.toBeNull();
  });

  it('banner text contains "Authoring mode" message', () => {
    isAdminSignal.set(true);
    enabledSignal.set(true);
    fixture.detectChanges();
    const banner: HTMLElement = fixture.nativeElement.querySelector('.edit-mode-banner');
    expect(banner.textContent).toContain('Edit mode');
  });
});
