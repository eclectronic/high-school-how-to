import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ColorPickerComponent } from './color-picker.component';
import { DEFAULT_PALETTE } from './color-utils';

describe('ColorPickerComponent', () => {
  let fixture: ComponentFixture<ColorPickerComponent>;
  let component: ColorPickerComponent;

  beforeEach(async () => {
    localStorage.removeItem('hsht_customPalette');
    localStorage.removeItem('hsht_colorHistory');

    await TestBed.configureTestingModule({
      imports: [ColorPickerComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ColorPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem('hsht_customPalette');
    localStorage.removeItem('hsht_colorHistory');
  });

  it('shows 16 preset swatches', () => {
    const swatches = fixture.nativeElement.querySelectorAll('.swatch-grid .swatch');
    expect(swatches.length).toBe(16);
  });

  it('emits colorChange when preset swatch is clicked', () => {
    const emitted: string[] = [];
    component.colorChange.subscribe((c: string) => emitted.push(c));

    const swatch: HTMLButtonElement = fixture.nativeElement.querySelector('.swatch');
    swatch.click();

    expect(emitted.length).toBe(1);
    expect(DEFAULT_PALETTE).toContain(emitted[0]);
  });

  it('adds color to history when selected', () => {
    component.selectPreset(DEFAULT_PALETTE[3]);
    expect(component['colorHistory']()).toContain(DEFAULT_PALETTE[3]);
  });

  it('saves color to palette at given index', () => {
    component['stagedColor'].set('#abcdef');
    component.saveToPalette(0);
    expect(component['palette']()[0]).toBe('#abcdef');
  });

  it('resets palette to defaults', () => {
    component['palette'].set(['#111111', ...DEFAULT_PALETTE.slice(1)]);
    component.resetPalette();
    expect(component['palette']()).toEqual(DEFAULT_PALETTE);
  });

  it('switches to gradient mode on tab click', () => {
    const tabs = fixture.nativeElement.querySelectorAll('.picker-tabs button');
    tabs[1].click();
    fixture.detectChanges();
    expect(component['mode']()).toBe('gradient');
    expect(fixture.nativeElement.querySelector('.gradient-builder')).toBeTruthy();
  });

  it('emits textColorChange with null when Auto is clicked', () => {
    const emitted: Array<string | null> = [];
    component.textColorChange.subscribe((v: string | null) => emitted.push(v));
    component.selectedTextColor = '#ff0000';
    component.clearTextColor();
    expect(emitted).toEqual([null]);
  });

  it('shows low-contrast badge when contrast is below 4.5:1', () => {
    // Light grey text on white background — low contrast
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
});
