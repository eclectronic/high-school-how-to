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

  it('shows popover with natural language input and picker', () => {
    expect(fixture.nativeElement.querySelector('.text-input')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.datetime-input')).toBeTruthy();
  });

  it('shows parsed preview for valid natural language input', () => {
    c.naturalText = 'April 10, 2026 at 3pm';
    c.onNaturalTextChange();
    fixture.detectChanges();
    const preview = fixture.nativeElement.querySelector('.preview');
    expect(preview).toBeTruthy();
    expect(preview.textContent).not.toContain("Couldn't parse");
  });

  it('shows error message for invalid natural language input', () => {
    c.naturalText = 'asdfghjkl not a date';
    c.onNaturalTextChange();
    fixture.detectChanges();
    const errorPreview = fixture.nativeElement.querySelector('.preview--error');
    expect(errorPreview).toBeTruthy();
  });

  it('shows no preview for empty input', () => {
    c.naturalText = '';
    c.onNaturalTextChange();
    fixture.detectChanges();
    const preview = fixture.nativeElement.querySelector('.preview');
    expect(preview).toBeFalsy();
  });

  it('emits null when Clear button is clicked', () => {
    const emitted: Array<string | null> = [];
    component.dueAtChange.subscribe((v: string | null) => emitted.push(v));

    const clearBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn--clear');
    clearBtn.click();

    expect(emitted).toEqual([null]);
  });

  it('emits ISO string when Apply is clicked after natural language parse', () => {
    const emitted: Array<string | null> = [];
    component.dueAtChange.subscribe((v: string | null) => emitted.push(v));

    c.naturalText = 'April 10, 2026 at 3pm';
    c.onNaturalTextChange();
    fixture.detectChanges();

    const applyBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn--apply');
    applyBtn.click();

    expect(emitted.length).toBe(1);
    expect(emitted[0]).toContain('2026-04-10');
  });

  it('Apply button is disabled when no date is set', () => {
    const applyBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn--apply');
    expect(applyBtn.disabled).toBeTrue();
  });

  it('Enter key applies when date is parsed', () => {
    const emitted: Array<string | null> = [];
    component.dueAtChange.subscribe((v: string | null) => emitted.push(v));

    c.naturalText = 'April 10, 2026 at 3pm';
    c.onNaturalTextChange();
    fixture.detectChanges();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('.text-input');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(emitted.length).toBe(1);
    expect(emitted[0]).toContain('2026-04-10');
  });

  it('Enter key does nothing when no date is parsed', () => {
    const emitted: Array<string | null> = [];
    component.dueAtChange.subscribe((v: string | null) => emitted.push(v));

    c.naturalText = 'not a date';
    c.onNaturalTextChange();
    fixture.detectChanges();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('.text-input');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(emitted.length).toBe(0);
  });

  it('Escape key emits null (cancel/clear)', () => {
    const emitted: Array<string | null> = [];
    component.dueAtChange.subscribe((v: string | null) => emitted.push(v));

    const input: HTMLInputElement = fixture.nativeElement.querySelector('.text-input');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(emitted).toEqual([null]);
  });

  it('pre-fills picker and preview when dueAt is provided', () => {
    component.dueAt = '2026-04-10T15:00:00.000Z';
    component.ngOnChanges({ dueAt: { currentValue: component.dueAt, previousValue: null, firstChange: true, isFirstChange: () => true } });
    fixture.detectChanges();
    expect(c.pickerValue).toContain('2026-04-10');
    expect(c.parsedDate()).not.toBeNull();
  });
});
