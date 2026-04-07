import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { InlineTitleEditComponent } from './inline-title-edit.component';

describe('InlineTitleEditComponent', () => {
  let fixture: ComponentFixture<InlineTitleEditComponent>;
  let component: InlineTitleEditComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InlineTitleEditComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(InlineTitleEditComponent);
    component = fixture.componentInstance;
    component.title = 'Original Title';
    fixture.detectChanges();
  });

  it('shows title in display mode by default', () => {
    const span = fixture.nativeElement.querySelector('.title-display');
    expect(span).toBeTruthy();
    expect(span.textContent).toContain('Original Title');
  });

  it('switches to edit mode on click', fakeAsync(() => {
    const span: HTMLElement = fixture.nativeElement.querySelector('.title-display');
    span.click();
    tick();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.title-input')).toBeTruthy();
  }));

  it('commits title on Enter key and emits titleChange', fakeAsync(() => {
    const emitted: string[] = [];
    component.titleChange.subscribe((v: string) => emitted.push(v));

    component.startEdit();
    tick();
    fixture.detectChanges();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('.title-input');
    input.value = 'New Title';
    input.dispatchEvent(new Event('input'));
    component['draft'] = 'New Title';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();

    expect(emitted).toEqual(['New Title']);
    expect(fixture.nativeElement.querySelector('.title-display')).toBeTruthy();
  }));

  it('cancels on Escape key and reverts to original title', fakeAsync(() => {
    const emitted: string[] = [];
    component.titleChange.subscribe((v: string) => emitted.push(v));

    component.startEdit();
    tick();
    fixture.detectChanges();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('.title-input');
    component['draft'] = 'Changed Title';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(emitted).toEqual([]);
    expect(fixture.nativeElement.querySelector('.title-display').textContent).toContain('Original Title');
  }));

  it('blocks empty title and shows error state', fakeAsync(() => {
    component.startEdit();
    tick();
    fixture.detectChanges();

    component['draft'] = '   '; // whitespace only
    component.commit();
    fixture.detectChanges();

    expect(component['hasError']()).toBeTrue();
    expect(fixture.nativeElement.querySelector('.title-input')).toBeTruthy(); // still in edit mode
  }));

  it('does not emit when title is unchanged', fakeAsync(() => {
    const emitted: string[] = [];
    component.titleChange.subscribe((v: string) => emitted.push(v));

    component.startEdit();
    tick();
    fixture.detectChanges();

    component['draft'] = 'Original Title';
    component.commit();
    fixture.detectChanges();

    expect(emitted).toEqual([]);
  }));
});
