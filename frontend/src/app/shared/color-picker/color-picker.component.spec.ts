import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ColorPickerComponent } from './color-picker.component';

describe('ColorPickerComponent', () => {
  let fixture: ComponentFixture<ColorPickerComponent>;
  let component: ColorPickerComponent;

  beforeEach(async () => {
    localStorage.removeItem('hsht_colorHistory');

    await TestBed.configureTestingModule({
      imports: [ColorPickerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ColorPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem('hsht_colorHistory');
  });

  // ── No tabs, no preset swatches, no save-to-palette ──────────────────────

  it('has no tab buttons', () => {
    const tabs = fixture.nativeElement.querySelector('.picker-tabs');
    expect(tabs).toBeFalsy();
  });

  it('has no swatch grid (preset swatches)', () => {
    const grid = fixture.nativeElement.querySelector('.swatch-grid');
    expect(grid).toBeFalsy();
  });

  it('has no save-to-palette button', () => {
    const btn = fixture.nativeElement.querySelector('.save-to-palette');
    expect(btn).toBeFalsy();
  });

  // ── Color input emits on change ───────────────────────────────────────────

  it('emits colorChange when native color input changes', () => {
    const emitted: string[] = [];
    component.colorChange.subscribe((c: string) => emitted.push(c));

    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type=color]');
    input.value = '#ff0000';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(emitted.length).toBe(1);
    expect(emitted[0]).toBe('#ff0000');
  });

  // ── Hex text input emits valid hex values ─────────────────────────────────

  it('emits colorChange on hex input blur with valid hex', () => {
    const emitted: string[] = [];
    component.colorChange.subscribe((c: string) => emitted.push(c));

    const hexInput: HTMLInputElement = fixture.nativeElement.querySelector('input.hex-input');
    hexInput.value = '#aabbcc';
    hexInput.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(emitted.length).toBe(1);
    expect(emitted[0]).toBe('#aabbcc');
  });

  it('does not emit colorChange on hex input blur with invalid value', () => {
    const emitted: string[] = [];
    component.colorChange.subscribe((c: string) => emitted.push(c));

    const hexInput: HTMLInputElement = fixture.nativeElement.querySelector('input.hex-input');
    hexInput.value = 'notahex';
    hexInput.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(emitted.length).toBe(0);
  });

  it('emits colorChange on hex input Enter with valid hex', () => {
    const emitted: string[] = [];
    component.colorChange.subscribe((c: string) => emitted.push(c));

    const hexInput: HTMLInputElement = fixture.nativeElement.querySelector('input.hex-input');
    hexInput.value = '#123456';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (component as any).applyHexValue({ target: hexInput } as unknown as Event);
    fixture.detectChanges();

    expect(emitted.length).toBe(1);
    expect(emitted[0]).toBe('#123456');
  });

  // ── Gradient checkbox ─────────────────────────────────────────────────────

  it('gradient checkbox: checked → emits linear-gradient', () => {
    const emitted: string[] = [];
    component.colorChange.subscribe((c: string) => emitted.push(c));

    // Set solid color first via the native picker so selectedColor is updated internally
    const nativeInput: HTMLInputElement = fixture.nativeElement.querySelector('input[type=color]');
    nativeInput.value = '#3366cc';
    nativeInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    emitted.length = 0; // clear the initial emission

    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('input[type=checkbox]');
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(emitted.length).toBe(1);
    expect(emitted[0]).toContain('linear-gradient');
    expect(emitted[0]).toContain('#ffffff');
    expect(emitted[0]).toContain('#3366cc');
  });

  it('gradient checkbox: unchecked → emits solid color', () => {
    const emitted: string[] = [];
    component.colorChange.subscribe((c: string) => emitted.push(c));

    // First select a solid color via native picker
    const nativeInput: HTMLInputElement = fixture.nativeElement.querySelector('input[type=color]');
    nativeInput.value = '#3366cc';
    nativeInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    // Then enable gradient
    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('input[type=checkbox]');
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    emitted.length = 0; // clear prior emissions

    // Now uncheck to revert to solid
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(emitted.length).toBe(1);
    expect(emitted[0]).toBe('#3366cc');
  });

  // ── Recent colors ─────────────────────────────────────────────────────────

  it('adds selected color to recent history when picker closes', () => {
    component.selectedColor = '#fffef8';
    fixture.detectChanges();

    const nativeInput: HTMLInputElement = fixture.nativeElement.querySelector('input[type=color]');
    nativeInput.value = '#aabbcc';
    nativeInput.dispatchEvent(new Event('change')); // change fires when picker closes
    fixture.detectChanges();

    expect(component['colorHistory']()).toContain('#aabbcc');
  });

  it('does not add to history on every input event (live preview only)', () => {
    const nativeInput: HTMLInputElement = fixture.nativeElement.querySelector('input[type=color]');
    nativeInput.value = '#aabbcc';
    nativeInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(component['colorHistory']()).not.toContain('#aabbcc');
  });

  it('moves duplicate color to front of recents', () => {
    // Pre-seed history
    component['colorHistory'].set(['#aa0000', '#bb0000', '#cc0000']);
    fixture.detectChanges();

    const nativeInput: HTMLInputElement = fixture.nativeElement.querySelector('input[type=color]');
    nativeInput.value = '#bb0000';
    nativeInput.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const history = component['colorHistory']();
    expect(history[0]).toBe('#bb0000');
    expect(history.filter(c => c === '#bb0000').length).toBe(1);
  });

  it('limits recent colors to 16', () => {
    const existing = Array.from({ length: 16 }, (_, i) => `#${i.toString().padStart(6, '0')}`);
    component['colorHistory'].set(existing);
    fixture.detectChanges();

    const nativeInput: HTMLInputElement = fixture.nativeElement.querySelector('input[type=color]');
    nativeInput.value = '#aaaaaa';
    nativeInput.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(component['colorHistory']().length).toBe(16);
  });

  it('persists recent colors to localStorage', () => {
    const nativeInput: HTMLInputElement = fixture.nativeElement.querySelector('input[type=color]');
    nativeInput.value = '#deadbe';
    nativeInput.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const stored = JSON.parse(localStorage.getItem('hsht_colorHistory') ?? '[]') as string[];
    expect(stored).toContain('#deadbe');
  });

  it('clicking a recent color re-selects it and emits', () => {
    component['colorHistory'].set(['#ff0000']);
    fixture.detectChanges();

    const emitted: string[] = [];
    component.colorChange.subscribe((c: string) => emitted.push(c));

    const swatch: HTMLButtonElement = fixture.nativeElement.querySelector('.swatch');
    swatch.click();
    fixture.detectChanges();

    expect(emitted.length).toBe(1);
    expect(emitted[0]).toBe('#ff0000');
  });

  // ── Text color ────────────────────────────────────────────────────────────

  it('auto mode emits null for textColorChange', () => {
    const emitted: Array<string | null> = [];
    component.textColorChange.subscribe((v: string | null) => emitted.push(v));
    component.selectedTextColor = '#ff0000';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (component as any).clearTextColor();
    expect(emitted).toEqual([null]);
  });

  it('shows low-contrast badge when contrast is below 4.5:1', () => {
    component.selectedColor = '#ffffff';
    component.selectedTextColor = '#cccccc';
    fixture.detectChanges();
    const badge = fixture.nativeElement.querySelector('.low-contrast-badge');
    expect(badge).toBeTruthy();
  });

  it('shows no low-contrast badge for good contrast', () => {
    component.selectedColor = '#ffffff';
    component.selectedTextColor = '#000000';
    fixture.detectChanges();
    const badge = fixture.nativeElement.querySelector('.low-contrast-badge');
    expect(badge).toBeFalsy();
  });

  it('auto text color returns correct contrast color for dark background', () => {
    // Select a dark color via native picker so selectedColor is updated via signal path
    const nativeInput: HTMLInputElement = fixture.nativeElement.querySelector('input[type=color]');
    nativeInput.value = '#000000';
    nativeInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(component['autoTextColor']()).toBe('#ffffff');
  });

  it('auto text color returns black for light background', () => {
    const nativeInput: HTMLInputElement = fixture.nativeElement.querySelector('input[type=color]');
    nativeInput.value = '#ffffff';
    nativeInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(component['autoTextColor']()).toBe('#000000');
  });
});
