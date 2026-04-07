import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmDialogComponent } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  let component: ConfirmDialogComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;
    component.itemName = 'My List';
    fixture.detectChanges();
  });

  it('displays item name in the default message', () => {
    const text = fixture.nativeElement.querySelector('.dialog__message').textContent;
    expect(text).toContain('My List');
  });

  it('uses custom message when provided', () => {
    component.message = 'Are you sure about this?';
    fixture.detectChanges();
    const text = fixture.nativeElement.querySelector('.dialog__message').textContent;
    expect(text).toContain('Are you sure about this?');
  });

  it('emits cancelled when Cancel button is clicked', () => {
    const emitted = jasmine.createSpy('cancelled');
    component.cancelled.subscribe(emitted);
    const cancelBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn--cancel');
    cancelBtn.click();
    expect(emitted).toHaveBeenCalled();
  });

  it('emits confirmed when Delete button is clicked', () => {
    const emitted = jasmine.createSpy('confirmed');
    component.confirmed.subscribe(emitted);
    const deleteBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn--delete');
    deleteBtn.click();
    expect(emitted).toHaveBeenCalled();
  });

  it('emits cancelled when backdrop is clicked', () => {
    const emitted = jasmine.createSpy('cancelled');
    component.cancelled.subscribe(emitted);
    const backdrop: HTMLElement = fixture.nativeElement.querySelector('.dialog-backdrop');
    backdrop.click();
    expect(emitted).toHaveBeenCalled();
  });
});
