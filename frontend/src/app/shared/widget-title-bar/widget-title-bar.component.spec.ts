import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { WidgetTitleBarComponent } from './widget-title-bar.component';

describe('WidgetTitleBarComponent', () => {
  let fixture: ComponentFixture<WidgetTitleBarComponent>;
  let component: WidgetTitleBarComponent;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let c: any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WidgetTitleBarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WidgetTitleBarComponent);
    component = fixture.componentInstance;
    c = component as any;
    component.title = 'My Widget';
    component.minimized = false;
    fixture.detectChanges();
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  it('renders title text', () => {
    const titleEl = fixture.nativeElement.querySelector('.title-bar__title');
    expect(titleEl.textContent.trim()).toBe('My Widget');
  });

  it('shows minimize button (—) when expanded', () => {
    const btn = fixture.nativeElement.querySelector('.title-bar__btn:not(.title-bar__btn--close)');
    expect(btn.textContent.trim()).toBe('—');
  });

  it('shows maximize button (☐) when minimized input is true', () => {
    component.minimized = true;
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('.title-bar__btn:not(.title-bar__btn--close)');
    expect(btn.textContent.trim()).toBe('☐');
  });

  it('always shows close button', () => {
    const closeBtn = fixture.nativeElement.querySelector('.title-bar__btn--close');
    expect(closeBtn).toBeTruthy();
  });

  it('applies minimized class to title bar when minimized', () => {
    component.minimized = true;
    fixture.detectChanges();
    const bar = fixture.nativeElement.querySelector('.title-bar');
    expect(bar.classList.contains('title-bar--minimized')).toBeTrue();
  });

  // ── Minimize toggle ────────────────────────────────────────────────────────

  it('emits minimizeToggled when minimize button is clicked', () => {
    let emitted = 0;
    component.minimizeToggled.subscribe(() => emitted++);
    const btn = fixture.debugElement.queryAll(By.css('.title-bar__btn'))
      .find(el => !el.nativeElement.classList.contains('title-bar__btn--close'))!;
    btn.triggerEventHandler('click', new MouseEvent('click'));
    expect(emitted).toBe(1);
  });

  it('emits minimizeToggled when maximize button is clicked', () => {
    component.minimized = true;
    fixture.detectChanges();
    let emitted = 0;
    component.minimizeToggled.subscribe(() => emitted++);
    const btn = fixture.debugElement.queryAll(By.css('.title-bar__btn'))
      .find(el => !el.nativeElement.classList.contains('title-bar__btn--close'))!;
    btn.triggerEventHandler('click', new MouseEvent('click'));
    expect(emitted).toBe(1);
  });

  // ── Close ──────────────────────────────────────────────────────────────────

  it('emits closeClicked when close button is clicked', () => {
    let emitted = 0;
    component.closeClicked.subscribe(() => emitted++);
    const closeBtn = fixture.debugElement.query(By.css('.title-bar__btn--close'));
    closeBtn.triggerEventHandler('click', new MouseEvent('click'));
    expect(emitted).toBe(1);
  });

  // ── Inline title edit ──────────────────────────────────────────────────────

  it('double-click on title enters edit mode', () => {
    const titleEl = fixture.nativeElement.querySelector('.title-bar__title');
    titleEl.dispatchEvent(new MouseEvent('dblclick'));
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('.title-bar__title-input');
    expect(input).toBeTruthy();
  });

  it('pressing Enter commits edit and emits titleChanged', () => {
    const emitted: string[] = [];
    component.titleChanged.subscribe((t: string) => emitted.push(t));

    c.startEdit();
    fixture.detectChanges();
    c.draft = 'New Title';
    const input: HTMLInputElement = fixture.nativeElement.querySelector('.title-bar__title-input');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();

    expect(emitted).toEqual(['New Title']);
    expect(c.editing()).toBeFalse();
  });

  it('blur commits edit and emits titleChanged', fakeAsync(() => {
    const emitted: string[] = [];
    component.titleChanged.subscribe((t: string) => emitted.push(t));

    c.startEdit();
    fixture.detectChanges();
    c.draft = 'Blurred Title';
    const input: HTMLInputElement = fixture.nativeElement.querySelector('.title-bar__title-input');
    input.dispatchEvent(new Event('blur'));
    tick(200);
    fixture.detectChanges();

    expect(emitted).toEqual(['Blurred Title']);
  }));

  it('does not emit titleChanged when title is unchanged', () => {
    const emitted: string[] = [];
    component.titleChanged.subscribe((t: string) => emitted.push(t));

    c.startEdit();
    fixture.detectChanges();
    // draft defaults to current title 'My Widget'
    c.commitEdit();

    expect(emitted.length).toBe(0);
  });

  it('Escape cancels edit without emitting titleChanged', () => {
    const emitted: string[] = [];
    component.titleChanged.subscribe((t: string) => emitted.push(t));

    c.startEdit();
    fixture.detectChanges();
    c.draft = 'Changed';
    const input: HTMLInputElement = fixture.nativeElement.querySelector('.title-bar__title-input');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(emitted.length).toBe(0);
    expect(c.editing()).toBeFalse();
  });
});
