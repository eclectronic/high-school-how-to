import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { HowToPageComponent } from './how-to-page.component';
import { ContentApiService } from '../../core/services/content-api.service';
import { ContentCard } from '../../core/models/content.models';
import { SessionStore } from '../../core/session/session.store';
import { EditModeStore } from '../../core/edit-mode/edit-mode.store';

const mockCards: ContentCard[] = [
  {
    id: 1,
    slug: 'vid-1',
    cardType: 'VIDEO',
    title: 'Test Video',
    description: null,
    mediaUrl: null,
    printMediaUrl: null,
    mediaUrls: [],
    thumbnailUrl: null,
    coverImageUrl: null,
    bodyHtml: null,
    backgroundColor: null,
    textColor: null,
    simpleLayout: false,
    status: 'PUBLISHED',
    tags: [{ id: 1, slug: 'academics', name: 'Academics', description: null, sortOrder: 1 }],
    links: [],
    templateTasks: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    slug: 'art-1',
    cardType: 'ARTICLE',
    title: 'About Us',
    description: null,
    mediaUrl: null,
    printMediaUrl: null,
    mediaUrls: [],
    thumbnailUrl: null,
    coverImageUrl: null,
    bodyHtml: null,
    backgroundColor: null,
    textColor: null,
    simpleLayout: false,
    status: 'PUBLISHED',
    tags: [{ id: 2, slug: 'about', name: 'About', description: null, sortOrder: 2 }],
    links: [],
    templateTasks: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 3,
    slug: 'help-1',
    cardType: 'ARTICLE',
    title: 'Help Article',
    description: null,
    mediaUrl: null,
    printMediaUrl: null,
    mediaUrls: [],
    thumbnailUrl: null,
    coverImageUrl: null,
    bodyHtml: null,
    backgroundColor: null,
    textColor: null,
    simpleLayout: false,
    status: 'PUBLISHED',
    tags: [{ id: 3, slug: 'help', name: 'Help', description: null, sortOrder: 3 }],
    links: [],
    templateTasks: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

describe('HowToPageComponent', () => {
  let fixture: ComponentFixture<HowToPageComponent>;
  let component: HowToPageComponent;
  let contentApiSpy: jasmine.SpyObj<ContentApiService>;

  beforeEach(async () => {
    contentApiSpy = jasmine.createSpyObj('ContentApiService', [
      'getPublishedCards', 'getAllTags', 'adminListCards', 'adminListTags',
    ]);
    contentApiSpy.getPublishedCards.and.returnValue(of(mockCards));
    contentApiSpy.getAllTags.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [HowToPageComponent, RouterTestingModule],
      providers: [
        { provide: ContentApiService, useValue: contentApiSpy },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(HowToPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders without error', () => {
    expect(component).toBeTruthy();
  });

  it('calls getPublishedCards on init', () => {
    expect(contentApiSpy.getPublishedCards).toHaveBeenCalledTimes(1);
  });

  it('filters out cards tagged "about" or "help" from visible cards', () => {
    const visible = (component as any).visibleCards() as ContentCard[];
    const slugs = visible.map((c) => c.slug);
    expect(slugs).toContain('vid-1');
    expect(slugs).not.toContain('art-1');
    expect(slugs).not.toContain('help-1');
  });

  it('shows all visible cards when no tag is selected', () => {
    (component as any).selectedTagSlug.set(null);
    const filtered = (component as any).filteredCards() as ContentCard[];
    expect(filtered.length).toBe(1);
    expect(filtered[0].slug).toBe('vid-1');
  });

  it('filters to only cards matching selectedTagSlug', () => {
    (component as any).selectedTagSlug.set('academics');
    const filtered = (component as any).filteredCards() as ContentCard[];
    expect(filtered.length).toBe(1);
    expect(filtered[0].slug).toBe('vid-1');
  });

  it('returns no cards when selectedTagSlug matches no visible card', () => {
    (component as any).selectedTagSlug.set('nonexistent');
    const filtered = (component as any).filteredCards() as ContentCard[];
    expect(filtered.length).toBe(0);
  });

  it('does not include "about" or "help" tags in availableTags', () => {
    const tags = (component as any).availableTags() as { slug: string }[];
    const tagSlugs = tags.map((t) => t.slug);
    expect(tagSlugs).not.toContain('about');
    expect(tagSlugs).not.toContain('help');
  });
});

// ── Status filter (admin edit mode) ──────────────────────────────────────────

describe('HowToPageComponent — status filter', () => {
  let fixture: ComponentFixture<HowToPageComponent>;
  let component: HowToPageComponent;

  const academicsTag = { id: 1, slug: 'academics', name: 'Academics', description: null, sortOrder: 1 };

  const baseCard: Omit<ContentCard, 'id' | 'slug' | 'title' | 'status'> = {
    cardType: 'ARTICLE',
    description: null,
    mediaUrl: null,
    printMediaUrl: null,
    mediaUrls: [],
    thumbnailUrl: null,
    coverImageUrl: null,
    bodyHtml: null,
    backgroundColor: null,
    textColor: null,
    simpleLayout: false,
    tags: [academicsTag],
    links: [],
    templateTasks: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const publishedCard: ContentCard = { ...baseCard, id: 10, slug: 'pub-card', title: 'Published', status: 'PUBLISHED' };
  const draftCard: ContentCard = { ...baseCard, id: 11, slug: 'draft-card', title: 'Draft', status: 'DRAFT' };

  beforeEach(async () => {
    const apiSpy = jasmine.createSpyObj('ContentApiService', ['adminListCards', 'adminListTags']);
    apiSpy.adminListCards.and.returnValue(of([publishedCard, draftCard]));
    apiSpy.adminListTags.and.returnValue(of([academicsTag]));

    const sessionStoreMock = {
      isAdmin: signal(true).asReadonly(),
      isAuthenticated: signal(false).asReadonly(),
      firstName: signal<string | null>(null).asReadonly(),
      avatarUrl: signal<string | null>(null).asReadonly(),
      getRefreshToken: jasmine.createSpy('getRefreshToken').and.returnValue(null),
      clearSession: jasmine.createSpy('clearSession'),
    };

    const editModeStoreMock = {
      enabled: signal(true).asReadonly(),
    };

    await TestBed.configureTestingModule({
      imports: [HowToPageComponent, RouterTestingModule],
      providers: [
        { provide: ContentApiService, useValue: apiSpy },
        { provide: SessionStore, useValue: sessionStoreMock },
        { provide: EditModeStore, useValue: editModeStoreMock },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(HowToPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows all visible cards when statusFilter is ALL', () => {
    (component as any).statusFilter.set('ALL');
    const filtered = (component as any).filteredCards() as ContentCard[];
    expect(filtered.length).toBe(2);
  });

  it('shows only published cards when statusFilter is PUBLISHED', () => {
    (component as any).statusFilter.set('PUBLISHED');
    const filtered = (component as any).filteredCards() as ContentCard[];
    expect(filtered.length).toBe(1);
    expect(filtered[0].slug).toBe('pub-card');
  });

  it('shows only draft cards when statusFilter is DRAFT', () => {
    (component as any).statusFilter.set('DRAFT');
    const filtered = (component as any).filteredCards() as ContentCard[];
    expect(filtered.length).toBe(1);
    expect(filtered[0].slug).toBe('draft-card');
  });

  it('status filter combines with topic filter', () => {
    (component as any).selectedTagSlug.set('academics');
    (component as any).statusFilter.set('DRAFT');
    const filtered = (component as any).filteredCards() as ContentCard[];
    expect(filtered.length).toBe(1);
    expect(filtered[0].slug).toBe('draft-card');
  });
});
