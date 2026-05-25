import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';
import { HomeLayoutComponent } from './home-layout.component';
import { HomeLayoutApiService } from '../../core/services/home-layout-api.service';
import { HomeSection } from '../../core/models/home-layout.models';

const mockSections: HomeSection[] = [
  { id: 1, sortOrder: 1, layout: 'split', slot1Tag: 'home-how-to', slot2Tag: 'home-locker' },
  { id: 2, sortOrder: 2, layout: 'full', slot1Tag: 'home-video', slot2Tag: null },
];

describe('HomeLayoutComponent', () => {
  let fixture: ComponentFixture<HomeLayoutComponent>;
  let component: HomeLayoutComponent;
  let apiMock: jasmine.SpyObj<HomeLayoutApiService>;

  beforeEach(async () => {
    apiMock = jasmine.createSpyObj('HomeLayoutApiService', ['adminList', 'adminSave']);
    apiMock.adminList.and.returnValue(of(mockSections));

    await TestBed.configureTestingModule({
      imports: [HomeLayoutComponent],
      providers: [{ provide: HomeLayoutApiService, useValue: apiMock }],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('addSection adds a new section', () => {
    const initialCount = component['sections']().length;
    component['addSection']();
    expect(component['sections']().length).toBe(initialCount + 1);
    const added = component['sections']()[initialCount];
    expect(added.layout).toBe('full');
    expect(added.slot1Tag).toBe('');
    expect(added.slot2Tag).toBeNull();
  });

  it('removeSection removes the correct section', () => {
    const initialCount = component['sections']().length;
    const firstId = component['sections']()[0].id;
    component['removeSection'](0);
    expect(component['sections']().length).toBe(initialCount - 1);
    expect(component['sections']()[0].id).not.toBe(firstId);
  });

  it('moveUp swaps sections correctly', () => {
    const sections = component['sections']();
    const firstId = sections[0].id;
    const secondId = sections[1].id;
    component['moveUp'](1);
    const updated = component['sections']();
    expect(updated[0].id).toBe(secondId);
    expect(updated[1].id).toBe(firstId);
  });
});
