import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PropertiesPanelComponent } from './properties-panel.component';
import { ContentCardAdmin } from '../../core/models/content.models';

function makeCard(overrides: Partial<ContentCardAdmin> = {}): ContentCardAdmin {
  return {
    id: 1,
    slug: 'test-card',
    title: 'Test Card',
    description: null,
    cardType: 'ARTICLE',
    status: 'DRAFT',
    mediaUrl: null,
    printMediaUrl: null,
    mediaUrls: [],
    thumbnailUrl: null,
    coverImageUrl: null,
    bodyJson: null,
    bodyHtml: null,
    backgroundColor: null,
    textColor: null,
    simpleLayout: false,
    tags: [],
    links: [],
    templateTasks: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  } as ContentCardAdmin;
}

describe('PropertiesPanelComponent', () => {
  let fixture: ComponentFixture<PropertiesPanelComponent>;
  let component: PropertiesPanelComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PropertiesPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PropertiesPanelComponent);
    component = fixture.componentInstance;
    component.card = makeCard();
    fixture.detectChanges();
  });

  it('panel is hidden on init', () => {
    const panel = fixture.nativeElement.querySelector('.props-panel');
    expect(panel).toBeNull();
  });

  it('clicking the toggle button opens the panel', () => {
    const toggleBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.props-toggle');
    toggleBtn.click();
    fixture.detectChanges();
    const panel = fixture.nativeElement.querySelector('.props-panel');
    expect(panel).not.toBeNull();
  });

  it('clicking the toggle button twice closes the panel', () => {
    const toggleBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.props-toggle');
    toggleBtn.click();
    fixture.detectChanges();
    toggleBtn.click();
    fixture.detectChanges();
    const panel = fixture.nativeElement.querySelector('.props-panel');
    expect(panel).toBeNull();
  });

  it('emits (change) with {status:"PUBLISHED"} when PUBLISHED radio is clicked', () => {
    const changes: Partial<ContentCardAdmin>[] = [];
    component.change.subscribe(v => changes.push(v));

    // Open the panel
    const toggleBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.props-toggle');
    toggleBtn.click();
    fixture.detectChanges();

    const publishedRadio: HTMLInputElement = fixture.nativeElement
      .querySelector('input[type="radio"][value="PUBLISHED"]');
    publishedRadio.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(changes.length).toBe(1);
    expect(changes[0]).toEqual({ status: 'PUBLISHED' });
  });

  it('emits (change) with {status:"DRAFT"} when DRAFT radio is clicked', () => {
    const changes: Partial<ContentCardAdmin>[] = [];
    component.change.subscribe(v => changes.push(v));
    component.card = makeCard({ status: 'PUBLISHED' });

    const toggleBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.props-toggle');
    toggleBtn.click();
    fixture.detectChanges();

    const draftRadio: HTMLInputElement = fixture.nativeElement
      .querySelector('input[type="radio"][value="DRAFT"]');
    draftRadio.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(changes.length).toBe(1);
    expect(changes[0]).toEqual({ status: 'DRAFT' });
  });

  it('emits (deleteCard) when Delete button is clicked', () => {
    const deleteSpy = jasmine.createSpy('deleteCard');
    component.deleteCard.subscribe(deleteSpy);

    const toggleBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.props-toggle');
    toggleBtn.click();
    fixture.detectChanges();

    const deleteBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-delete');
    deleteBtn.click();
    fixture.detectChanges();

    expect(deleteSpy).toHaveBeenCalled();
  });

  it('cardTypes includes ARTICLE, INFOGRAPHIC, VIDEO, TODO_LIST', () => {
    const toggleBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.props-toggle');
    toggleBtn.click();
    fixture.detectChanges();

    const options: HTMLOptionElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('select option')
    );
    const values = options.map(o => o.value);
    expect(values).toContain('ARTICLE');
    expect(values).toContain('INFOGRAPHIC');
    expect(values).toContain('VIDEO');
    expect(values).toContain('TODO_LIST');
  });
});
