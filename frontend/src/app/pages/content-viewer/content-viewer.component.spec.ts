import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { signal } from '@angular/core';
import { of, Subject } from 'rxjs';
import { Title } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ContentViewerComponent } from './content-viewer.component';
import { ContentApiService } from '../../core/services/content-api.service';
import { SessionStore } from '../../core/session/session.store';
import { ContentCard } from '../../core/models/content.models';

// Minimal card factory — only the fields the component actually reads
function makeCard(overrides: Partial<ContentCard> = {}): ContentCard {
  return {
    id: 1,
    slug: 'test-slug',
    title: 'Test Card',
    description: 'Test description',
    cardType: 'VIDEO',
    status: 'PUBLISHED',
    mediaUrl: 'https://youtu.be/abc123',
    printMediaUrl: null,
    coverImageUrl: null,
    bodyHtml: null,
    backgroundColor: null,
    textColor: null,
    simpleLayout: false,
    tags: [],
    links: [],
    templateTasks: [],
    ...overrides,
  } as ContentCard;
}

describe('ContentViewerComponent', () => {
  let fixture: ComponentFixture<ContentViewerComponent>;
  let component: ContentViewerComponent;

  const paramMapSubject = new Subject<ReturnType<typeof convertToParamMap>>();
  const queryParamMapSubject = new Subject<ReturnType<typeof convertToParamMap>>();
  let isAuthSignal: ReturnType<typeof signal<boolean>>;

  let apiMock: jasmine.SpyObj<ContentApiService>;

  beforeEach(async () => {
    isAuthSignal = signal(false);

    apiMock = jasmine.createSpyObj('ContentApiService', [
      'getCardBySlug',
      'getPublishedCards',
      'getCardsByTag',
      'getLockerStatus',
      'addToLocker',
    ]);
    apiMock.getPublishedCards.and.returnValue(of([]));
    apiMock.getCardsByTag.and.returnValue(of([]));
    apiMock.getCardBySlug.and.returnValue(of(makeCard()));

    const sessionStoreMock = {
      isAuthenticated: isAuthSignal.asReadonly(),
      isAdmin: signal(false).asReadonly(),
      clearSession: jasmine.createSpy('clearSession'),
    };

    await TestBed.configureTestingModule({
      imports: [ContentViewerComponent, RouterTestingModule],
      providers: [
        { provide: ContentApiService, useValue: apiMock },
        { provide: SessionStore, useValue: sessionStoreMock },
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { data: {}, paramMap: convertToParamMap({ slug: 'test-slug' }) },
            paramMap: paramMapSubject.asObservable(),
            queryParamMap: queryParamMapSubject.asObservable(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ContentViewerComponent);
    component = fixture.componentInstance;
  });

  function initWithCard(card: ContentCard): void {
    apiMock.getCardBySlug.and.returnValue(of(card));
    fixture.detectChanges(); // triggers ngOnInit
    queryParamMapSubject.next(convertToParamMap({}));
    paramMapSubject.next(convertToParamMap({ slug: card.slug }));
    fixture.detectChanges();
  }

  // ── Nav arrows in nav bar ────────────────────────────────────────────────────

  it('renders nav arrows in the nav bar', () => {
    initWithCard(makeCard());
    const arrows = fixture.nativeElement.querySelectorAll('.viewer-nav__arrows .viewer-arrow');
    expect(arrows.length).toBe(2);
  });

  it('does not render side arrow columns', () => {
    initWithCard(makeCard());
    const sideCols = fixture.nativeElement.querySelectorAll('.viewer-arrow-col');
    expect(sideCols.length).toBe(0);
  });

  it('disables prev arrow when no previous card', () => {
    initWithCard(makeCard());
    const [prevBtn] = fixture.nativeElement.querySelectorAll('.viewer-nav__arrows .viewer-arrow');
    expect(prevBtn.disabled).toBeTrue();
  });

  it('disables next arrow when no next card', () => {
    initWithCard(makeCard());
    const [, nextBtn] = fixture.nativeElement.querySelectorAll('.viewer-nav__arrows .viewer-arrow');
    expect(nextBtn.disabled).toBeTrue();
  });

  it('hides nav bar in simple layout', () => {
    initWithCard(makeCard({ simpleLayout: true }));
    const nav = fixture.nativeElement.querySelector('.viewer-nav');
    expect(nav).toBeNull();
  });

  // ── VIDEO content type ───────────────────────────────────────────────────────

  it('renders video title in combined nav header and iframe in article', () => {
    initWithCard(makeCard({ cardType: 'VIDEO', mediaUrl: 'https://youtu.be/abc123' }));
    const title = fixture.nativeElement.querySelector('.viewer-nav__title');
    expect(title.textContent).toContain('Test Card');
    const iframe = fixture.nativeElement.querySelector('iframe');
    expect(iframe).toBeTruthy();
  });

  // ── INFOGRAPHIC content type ─────────────────────────────────────────────────

  it('renders infographic image in the panel', () => {
    initWithCard(makeCard({ cardType: 'INFOGRAPHIC', mediaUrl: '/media/test.jpg' }));
    const img = fixture.nativeElement.querySelector('.infographic-panel img');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('/media/test.jpg');
  });

  it('renders infographic title in nav bar', () => {
    initWithCard(makeCard({ cardType: 'INFOGRAPHIC', mediaUrl: '/media/test.jpg' }));
    const title = fixture.nativeElement.querySelector('.viewer-nav__title');
    expect(title).toBeTruthy();
    expect(title.textContent).toContain('Test Card');
  });

  it('shows overlay on infographic load', fakeAsync(() => {
    initWithCard(makeCard({ cardType: 'INFOGRAPHIC', mediaUrl: '/media/test.jpg' }));
    fixture.detectChanges();
    const overlay = fixture.nativeElement.querySelector('.infographic-overlay');
    expect(overlay.classList).not.toContain('infographic-overlay--hidden');
    tick(3000);
    fixture.detectChanges();
    expect(overlay.classList).toContain('infographic-overlay--hidden');
  }));

  it('toggleOverlay flips overlay visibility', () => {
    initWithCard(makeCard({ cardType: 'INFOGRAPHIC', mediaUrl: '/media/test.jpg' }));
    fixture.detectChanges();
    expect(component['overlayVisible']()).toBeTrue();
    component['toggleOverlay']();
    expect(component['overlayVisible']()).toBeFalse();
    component['toggleOverlay']();
    expect(component['overlayVisible']()).toBeTrue();
  });

  // ── ARTICLE content type ─────────────────────────────────────────────────────

  it('renders article with narrow width class', () => {
    initWithCard(makeCard({ cardType: 'ARTICLE', bodyHtml: '<p>Hello</p>' }));
    const article = fixture.nativeElement.querySelector('article.viewer-article--article');
    expect(article).toBeTruthy();
  });

  // ── Related links ────────────────────────────────────────────────────────────

  it('renders related links section when card has links', () => {
    const card = makeCard({
      cardType: 'VIDEO',
      links: [{ id: 1, targetSlug: 'other-slug', targetCardType: 'ARTICLE', linkText: 'See also', sortOrder: 0 }],
    } as any);
    initWithCard(card);
    const related = fixture.nativeElement.querySelector('.viewer-related');
    expect(related).toBeTruthy();
    expect(related.textContent).toContain('See also');
  });

  it('does not render related links section when card has no links', () => {
    initWithCard(makeCard({ cardType: 'VIDEO', links: [] }));
    const related = fixture.nativeElement.querySelector('.viewer-related');
    expect(related).toBeNull();
  });

  // ── Page title ───────────────────────────────────────────────────────────────

  it('sets page title to card title on load', () => {
    const titleService = TestBed.inject(Title) as Title;
    initWithCard(makeCard({ title: 'My Awesome Video' }));
    expect(titleService.getTitle()).toBe('My Awesome Video | High School How To');
  });
});
