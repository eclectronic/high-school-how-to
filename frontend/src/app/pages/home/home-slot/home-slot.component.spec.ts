import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { HomeSlotComponent } from './home-slot.component';
import { ContentApiService } from '../../../core/services/content-api.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

function makeCard(overrides: Partial<any> = {}): any {
  return {
    id: 1,
    slug: 'test-card',
    title: 'Test',
    cardType: 'ARTICLE',
    bodyHtml: '<p>Hello</p>',
    mediaUrl: null,
    mediaUrls: [],
    backgroundColor: null,
    textColor: null,
    tags: [],
    links: [],
    templateTasks: [],
    simpleLayout: false,
    description: null,
    ...overrides,
  };
}

describe('HomeSlotComponent', () => {
  let fixture: ComponentFixture<HomeSlotComponent>;
  let component: HomeSlotComponent;
  let contentApiSpy: jasmine.SpyObj<ContentApiService>;

  beforeEach(async () => {
    contentApiSpy = jasmine.createSpyObj('ContentApiService', ['getCardsByTag']);
    contentApiSpy.getCardsByTag.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [HomeSlotComponent],
      providers: [
        { provide: ContentApiService, useValue: contentApiSpy },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeSlotComponent);
    component = fixture.componentInstance;
    component.slotTag = 'about';
  });

  it('renders nothing when no card is returned', () => {
    contentApiSpy.getCardsByTag.and.returnValue(of([]));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.slot')).toBeNull();
  });

  it('renders article card when slot tag returns an ARTICLE card', () => {
    contentApiSpy.getCardsByTag.and.returnValue(of([makeCard({ cardType: 'ARTICLE' })]));
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.slot__article')).toBeTruthy();
  });

  it('renders video card when slot tag returns a VIDEO card', () => {
    const card = makeCard({
      cardType: 'VIDEO',
      mediaUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    });
    contentApiSpy.getCardsByTag.and.returnValue(of([card]));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.slot__video')).toBeTruthy();
  });

  it('renders infographic card when slot tag returns an INFOGRAPHIC card', () => {
    const card = makeCard({
      cardType: 'INFOGRAPHIC',
      mediaUrls: [{ url: '/media/test.jpg', printUrl: null, alt: null }],
    });
    contentApiSpy.getCardsByTag.and.returnValue(of([card]));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.slot__infographic')).toBeTruthy();
  });
});
