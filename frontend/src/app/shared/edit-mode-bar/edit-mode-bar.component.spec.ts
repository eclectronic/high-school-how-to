import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { EditModeBarComponent } from './edit-mode-bar.component';
import { EditModeStore } from '../../core/edit-mode/edit-mode.store';
import { SessionStore } from '../../core/session/session.store';

describe('EditModeBarComponent', () => {
  let fixture: ComponentFixture<EditModeBarComponent>;
  let isAdminSignal: ReturnType<typeof signal<boolean>>;
  let isDirtySignal: ReturnType<typeof signal<boolean>>;
  let lastErrorSignal: ReturnType<typeof signal<string | null>>;
  let requestSaveSpy: jasmine.Spy;
  let discardSpy: jasmine.Spy;

  beforeEach(async () => {
    isAdminSignal = signal(true); // default to admin for bar tests
    isDirtySignal = signal(false);
    lastErrorSignal = signal<string | null>(null);
    requestSaveSpy = jasmine.createSpy('requestSave');
    discardSpy = jasmine.createSpy('discard');

    const sessionStoreMock = {
      isAdmin: isAdminSignal.asReadonly(),
    };

    const editModeStoreMock = {
      isDirty: computed(() => isDirtySignal()),
      lastError: lastErrorSignal.asReadonly(),
      requestSave: requestSaveSpy,
      discard: discardSpy,
    };

    await TestBed.configureTestingModule({
      imports: [EditModeBarComponent],
      providers: [
        { provide: SessionStore, useValue: sessionStoreMock },
        { provide: EditModeStore, useValue: editModeStoreMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EditModeBarComponent);
  });

  it('is hidden when isDirty() is false', () => {
    isDirtySignal.set(false);
    fixture.detectChanges();
    const bar = fixture.nativeElement.querySelector('.edit-mode-bar');
    expect(bar).toBeNull();
  });

  it('is visible when isAdmin() and isDirty() are both true', () => {
    isAdminSignal.set(true);
    isDirtySignal.set(true);
    fixture.detectChanges();
    const bar = fixture.nativeElement.querySelector('.edit-mode-bar');
    expect(bar).not.toBeNull();
  });

  it('is hidden when not admin even if isDirty()', () => {
    isAdminSignal.set(false);
    isDirtySignal.set(true);
    fixture.detectChanges();
    const bar = fixture.nativeElement.querySelector('.edit-mode-bar');
    expect(bar).toBeNull();
  });

  it('Save button calls requestSave()', () => {
    isDirtySignal.set(true);
    fixture.detectChanges();
    const saveBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.edit-mode-bar__btn--save');
    saveBtn.click();
    expect(requestSaveSpy).toHaveBeenCalled();
  });

  it('Discard button calls discard()', () => {
    isDirtySignal.set(true);
    fixture.detectChanges();
    const discardBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.edit-mode-bar__btn--discard');
    discardBtn.click();
    expect(discardSpy).toHaveBeenCalled();
  });

  it('error message is not visible when lastError() is null', () => {
    isDirtySignal.set(true);
    lastErrorSignal.set(null);
    fixture.detectChanges();
    const errorEl = fixture.nativeElement.querySelector('.edit-mode-bar__error');
    expect(errorEl).toBeNull();
  });

  it('error message is visible when lastError() is set', () => {
    isDirtySignal.set(true);
    lastErrorSignal.set('Save failed: network error');
    fixture.detectChanges();
    const errorEl: HTMLElement = fixture.nativeElement.querySelector('.edit-mode-bar__error');
    expect(errorEl).not.toBeNull();
    expect(errorEl.textContent).toContain('Save failed: network error');
  });
});
