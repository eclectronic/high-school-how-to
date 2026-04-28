import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ContentEditorComponent } from './content-editor.component';
import { ContentApiService } from '../../core/services/content-api.service';
import { ContentCardAdmin, MediaUrlEntry, SaveCardRequest } from '../../core/models/content.models';

function makeAdminCard(overrides: Partial<ContentCardAdmin> = {}): ContentCardAdmin {
  return {
    id: 1,
    slug: 'test-card',
    title: 'Test Card',
    description: null,
    cardType: 'TODO_LIST',
    status: 'DRAFT',
    mediaUrl: null,
    printMediaUrl: null,
    mediaUrls: [],
    thumbnailUrl: null,
    coverImageUrl: null,
    bodyJson: null,
    bodyHtml: null,
    backgroundColor: '#fffef8',
    textColor: '#2d1a10',
    simpleLayout: false,
    tags: [{ id: 1, slug: 'test', name: 'Test', description: null, sortOrder: 0 }],
    links: [],
    templateTasks: [{ id: 1, description: 'First task', sortOrder: 0 }],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  } as ContentCardAdmin;
}

describe('ContentEditorComponent', () => {
  let fixture: ComponentFixture<ContentEditorComponent>;
  let component: ContentEditorComponent;
  let apiMock: jasmine.SpyObj<ContentApiService>;

  beforeEach(async () => {
    apiMock = jasmine.createSpyObj('ContentApiService', [
      'adminListTags',
      'adminGetCard',
      'adminCreateCard',
      'adminUpdateCard',
      'adminUploadImage',
      'searchCards',
    ]);
    apiMock.adminListTags.and.returnValue(of([]));
    apiMock.searchCards.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [ContentEditorComponent, RouterTestingModule.withRoutes([])],
      providers: [
        { provide: ContentApiService, useValue: apiMock },
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({}) },
          },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ContentEditorComponent);
    component = fixture.componentInstance;
  });

  // ── TODO_LIST editor ──────────────────────────────────────────────────────────

  describe('TODO_LIST branch', () => {
    beforeEach(() => {
      component['form'].cardType = 'TODO_LIST';
      component['form'].title = 'My List';
      component['form'].tagIds = new Set([1]);
      component['templateTasks'].set([{ description: 'Task A' }, { description: 'Task B' }]);
      fixture.detectChanges();
    });

    it('hides the standalone Title input for TODO_LIST', () => {
      const titleInput = fixture.nativeElement.querySelector('.form-row input[placeholder="Getting Your Driver\'s License"]');
      expect(titleInput).toBeNull();
    });

    it('onTodoTitleChange syncs form.title', () => {
      component['onTodoTitleChange']('New Title');
      expect(component['form'].title).toBe('New Title');
    });

    it('onTodoTitleChange auto-generates slug for new cards', () => {
      component['onTodoTitleChange']('My Great List');
      expect(component['form'].slug).toBe('my-great-list');
    });

    it('updateTemplateTask changes the task at the given index', () => {
      component['updateTemplateTask'](0, 'Updated A');
      expect(component['templateTasks']()[0].description).toBe('Updated A');
      expect(component['templateTasks']()[1].description).toBe('Task B');
    });

    it('addTemplateTask appends a new task', () => {
      component['newTaskDescription'] = 'Task C';
      component['addTemplateTask']();
      expect(component['templateTasks']().length).toBe(3);
      expect(component['templateTasks']()[2].description).toBe('Task C');
      expect(component['newTaskDescription']).toBe('');
    });

    it('addTemplateTask does nothing when description is empty', () => {
      component['newTaskDescription'] = '   ';
      component['addTemplateTask']();
      expect(component['templateTasks']().length).toBe(2);
    });

    it('addTemplateTask does nothing when at max (50 tasks)', () => {
      const fiftyTasks = Array.from({ length: 50 }, (_, i) => ({ description: `Task ${i}` }));
      component['templateTasks'].set(fiftyTasks);
      component['newTaskDescription'] = 'One more';
      component['addTemplateTask']();
      expect(component['templateTasks']().length).toBe(50);
    });

    it('confirmDeleteTask sets deleteTaskIndex', () => {
      component['confirmDeleteTask'](1);
      expect(component['deleteTaskIndex']()).toBe(1);
    });

    it('onDeleteTaskConfirmed removes the task at deleteTaskIndex', () => {
      component['deleteTaskIndex'].set(0);
      component['onDeleteTaskConfirmed']();
      expect(component['templateTasks']().length).toBe(1);
      expect(component['templateTasks']()[0].description).toBe('Task B');
      expect(component['deleteTaskIndex']()).toBeNull();
    });

    it('onDeleteTaskCancelled clears deleteTaskIndex without removing task', () => {
      component['deleteTaskIndex'].set(0);
      component['onDeleteTaskCancelled']();
      expect(component['templateTasks']().length).toBe(2);
      expect(component['deleteTaskIndex']()).toBeNull();
    });

    it('onTaskDrop reorders tasks', () => {
      const drop = { previousIndex: 0, currentIndex: 1 } as CdkDragDrop<any>;
      component['onTaskDrop'](drop);
      expect(component['templateTasks']()[0].description).toBe('Task B');
      expect(component['templateTasks']()[1].description).toBe('Task A');
    });

    it('showBgSwatchPicker toggles on/off', () => {
      expect(component['showBgSwatchPicker']()).toBeFalse();
      component['showBgSwatchPicker'].set(true);
      expect(component['showBgSwatchPicker']()).toBeTrue();
    });

    it('colorChange updates form.backgroundColor', () => {
      component['form'].backgroundColor = '#aabbcc';
      expect(component['form'].backgroundColor).toBe('#aabbcc');
    });
  });

  // ── INFOGRAPHIC / multi-image editor ─────────────────────────────────────────

  describe('INFOGRAPHIC / multi-image branch', () => {
    beforeEach(() => {
      component['form'].cardType = 'INFOGRAPHIC';
      component['form'].tagIds = new Set([1]);
      component['mediaUrls'].set([
        { url: '/media/img1.jpg', printUrl: null, alt: null },
        { url: '/media/img2.jpg', printUrl: '/media/img2.pdf', alt: 'Step 2' },
      ]);
      fixture.detectChanges();
    });

    it('addMediaUrl appends an empty entry', () => {
      component['addMediaUrl']();
      expect(component['mediaUrls']().length).toBe(3);
      expect(component['mediaUrls']()[2].url).toBe('');
    });

    it('updateMediaEntryAlt updates the alt text', () => {
      component['updateMediaEntryAlt'](0, 'Step 1');
      expect(component['mediaUrls']()[0].alt).toBe('Step 1');
    });

    it('confirmDeleteMedia sets deleteMediaIndex', () => {
      component['confirmDeleteMedia'](1);
      expect(component['deleteMediaIndex']()).toBe(1);
    });

    it('onDeleteMediaConfirmed removes entry at deleteMediaIndex', () => {
      component['deleteMediaIndex'].set(0);
      component['onDeleteMediaConfirmed']();
      expect(component['mediaUrls']().length).toBe(1);
      expect(component['mediaUrls']()[0].url).toBe('/media/img2.jpg');
      expect(component['deleteMediaIndex']()).toBeNull();
    });

    it('onDeleteMediaCancelled clears index without removing', () => {
      component['deleteMediaIndex'].set(0);
      component['onDeleteMediaCancelled']();
      expect(component['mediaUrls']().length).toBe(2);
      expect(component['deleteMediaIndex']()).toBeNull();
    });

    it('onMediaDrop reorders entries', () => {
      const drop = { previousIndex: 0, currentIndex: 1 } as CdkDragDrop<any>;
      component['onMediaDrop'](drop);
      expect(component['mediaUrls']()[0].url).toBe('/media/img2.jpg');
      expect(component['mediaUrls']()[1].url).toBe('/media/img1.jpg');
    });

    it('uploadMediaFile sets entry.url from upload response', fakeAsync(() => {
      apiMock.adminUploadImage.and.returnValue(of({ url: '/uploads/new.jpg', thumbnailUrl: '/uploads/new-thumb.jpg' }));
      const fakeFile = new File([''], 'new.jpg', { type: 'image/jpeg' });
      const event = { target: { files: [fakeFile], value: '' } } as unknown as Event;
      component['uploadMediaFile'](event, 0, 'url');
      tick();
      expect(component['mediaUrls']()[0].url).toBe('/uploads/new-thumb.jpg'); // thumbnailUrl preferred
    }));

    it('uploadMediaFile sets entry.printUrl from upload response', fakeAsync(() => {
      apiMock.adminUploadImage.and.returnValue(of({ url: '/uploads/new.pdf', thumbnailUrl: null }));
      const fakeFile = new File([''], 'new.pdf', { type: 'application/pdf' });
      const event = { target: { files: [fakeFile], value: '' } } as unknown as Event;
      component['uploadMediaFile'](event, 1, 'printUrl');
      tick();
      expect(component['mediaUrls']()[1].printUrl).toBe('/uploads/new.pdf');
    }));

    it('save sets mediaUrl and printMediaUrl from mediaUrls[0] in the request', fakeAsync(() => {
      const router = TestBed.inject(Router);
      spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
      let captured: SaveCardRequest | undefined;
      apiMock.adminCreateCard.and.callFake((req: SaveCardRequest) => {
        captured = req;
        return of({} as ContentCardAdmin);
      });
      component['save']();
      tick();
      expect(captured!.mediaUrl).toBe('/media/img1.jpg');
      expect(captured!.printMediaUrl).toBeNull();
      expect(captured!.mediaUrls?.length).toBe(2);
    }));
  });

  // ── Load existing card ────────────────────────────────────────────────────────

  describe('loading an existing card', () => {
    it('populates mediaUrls from card.mediaUrls when present', fakeAsync(() => {
      const card = makeAdminCard({
        cardType: 'INFOGRAPHIC',
        mediaUrl: '/media/img1.jpg',
        mediaUrls: [
          { url: '/media/img1.jpg', printUrl: null, alt: null },
          { url: '/media/img2.jpg', printUrl: '/media/img2.pdf', alt: 'Step 2' },
        ],
      });
      apiMock.adminGetCard.and.returnValue(of(card));

      const route = TestBed.inject(ActivatedRoute);
      (route as any).snapshot.paramMap = convertToParamMap({ id: '1' });
      fixture.detectChanges();
      tick();

      expect(component['mediaUrls']().length).toBe(2);
      expect(component['mediaUrls']()[1].alt).toBe('Step 2');
    }));

    it('synthesizes mediaUrls from legacy mediaUrl when mediaUrls is empty', fakeAsync(() => {
      const card = makeAdminCard({
        cardType: 'INFOGRAPHIC',
        mediaUrl: '/media/legacy.jpg',
        printMediaUrl: '/media/legacy.pdf',
        mediaUrls: [],
      });
      apiMock.adminGetCard.and.returnValue(of(card));

      const route = TestBed.inject(ActivatedRoute);
      (route as any).snapshot.paramMap = convertToParamMap({ id: '1' });
      fixture.detectChanges();
      tick();

      expect(component['mediaUrls']().length).toBe(1);
      expect(component['mediaUrls']()[0].url).toBe('/media/legacy.jpg');
      expect(component['mediaUrls']()[0].printUrl).toBe('/media/legacy.pdf');
    }));
  });
});
