import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DueDatePopoverComponent } from './due-date-popover.component';

describe('DueDatePopoverComponent', () => {
  let fixture: ComponentFixture<DueDatePopoverComponent>;
  let component: DueDatePopoverComponent;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let c: any; // cast for protected member access in tests

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DueDatePopoverComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(DueDatePopoverComponent);
    component = fixture.componentInstance;
    c = component as any;
    fixture.detectChanges();
  });

  it('shows only a datetime picker (no natural language input)', () => {
    expect(fixture.nativeElement.querySelector('.datetime-input')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.text-input')).toBeFalsy();
  });

  it('Apply button is disabled when no date is set', () => {
    c.pickerValue = '';
    fixture.detectChanges();
    const applyBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn--save');
    expect(applyBtn.disabled).toBeTrue();
  });

  it('Apply button is enabled after a picker value is set', () => {
    c.pickerValue = '2026-04-10T15:00';
    fixture.detectChanges();
    const applyBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn--save');
    expect(applyBtn.disabled).toBeFalse();
  });

  it('emits ISO string when Apply is clicked', () => {
    const emitted: Array<string | null> = [];
    component.dueAtChange.subscribe((v: string | null) => emitted.push(v));

    c.pickerValue = '2026-04-10T15:00';
    fixture.detectChanges();

    const applyBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn--save');
    applyBtn.click();

    expect(emitted.length).toBe(1);
    expect(emitted[0]).toContain('2026-04-10');
  });

  it('emits null when Clear is clicked', () => {
    const emitted: Array<string | null> = [];
    component.dueAtChange.subscribe((v: string | null) => emitted.push(v));

    const clearBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn--clear');
    clearBtn.click();

    expect(emitted).toEqual([null]);
  });

  it('pre-fills picker when dueAt input is provided', () => {
    component.dueAt = '2026-04-10T15:00:00.000Z';
    component.ngOnChanges({ dueAt: { currentValue: component.dueAt, previousValue: null, firstChange: true, isFirstChange: () => true } });
    fixture.detectChanges();
    expect(c.pickerValue).toContain('2026-04-10');
  });

  it('clear resets the picker value', () => {
    c.pickerValue = '2026-04-10T15:00';
    fixture.detectChanges();
    c.clear();
    expect(c.pickerValue).toBe('');
  });
});
