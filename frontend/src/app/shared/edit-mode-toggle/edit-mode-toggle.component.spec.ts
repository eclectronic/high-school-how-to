import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { EditModeToggleComponent } from './edit-mode-toggle.component';
import { EditModeStore } from '../../core/edit-mode/edit-mode.store';
import { SessionStore } from '../../core/session/session.store';

describe('EditModeToggleComponent', () => {
  let fixture: ComponentFixture<EditModeToggleComponent>;
  let isAdminSignal: ReturnType<typeof signal<boolean>>;
  let enabledSignal: ReturnType<typeof signal<boolean>>;
  let toggleSpy: jasmine.Spy;

  beforeEach(async () => {
    isAdminSignal = signal(false);
    enabledSignal = signal(false);
    toggleSpy = jasmine.createSpy('toggle');

    const sessionStoreMock = {
      isAdmin: isAdminSignal.asReadonly(),
    };

    const editModeStoreMock = {
      enabled: enabledSignal.asReadonly(),
      toggle: toggleSpy,
    };

    await TestBed.configureTestingModule({
      imports: [EditModeToggleComponent],
      providers: [
        { provide: SessionStore, useValue: sessionStoreMock },
        { provide: EditModeStore, useValue: editModeStoreMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EditModeToggleComponent);
  });

  it('renders nothing when isAdmin() is false', () => {
    isAdminSignal.set(false);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button');
    expect(button).toBeNull();
  });

  it('renders the toggle button when isAdmin() is true', () => {
    isAdminSignal.set(true);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button.edit-mode-toggle');
    expect(button).not.toBeNull();
  });

  it('calls editModeStore.toggle() when button is clicked', () => {
    isAdminSignal.set(true);
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button.edit-mode-toggle');
    button.click();
    expect(toggleSpy).toHaveBeenCalled();
  });

  it('button has active class when enabled() is true', () => {
    isAdminSignal.set(true);
    enabledSignal.set(true);
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button.edit-mode-toggle');
    expect(button.classList).toContain('edit-mode-toggle--on');
  });

  it('button does not have active class when enabled() is false', () => {
    isAdminSignal.set(true);
    enabledSignal.set(false);
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button.edit-mode-toggle');
    expect(button.classList).not.toContain('edit-mode-toggle--on');
  });
});
