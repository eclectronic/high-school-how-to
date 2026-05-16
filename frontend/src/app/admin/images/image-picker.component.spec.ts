import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { ImagePickerComponent } from './image-picker.component';
import { MediaApiService, MediaAsset, MediaPage } from '../../core/services/media-api.service';

function makeAsset(overrides: Partial<MediaAsset> = {}): MediaAsset {
  return {
    id: 1,
    url: 'https://cdn.example.com/img1.jpeg',
    filename: 'img1.jpeg',
    altText: null,
    mimeType: 'image/jpeg',
    sizeBytes: 1024,
    width: 100,
    height: 100,
    uploadedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makePage(assets: MediaAsset[], totalPages = 1): MediaPage {
  return {
    content: assets,
    totalElements: assets.length,
    totalPages,
    number: 0,
    size: 48,
  };
}

describe('ImagePickerComponent', () => {
  let fixture: ComponentFixture<ImagePickerComponent>;
  let component: ImagePickerComponent;
  let apiMock: jasmine.SpyObj<MediaApiService>;

  beforeEach(async () => {
    apiMock = jasmine.createSpyObj('MediaApiService', ['list', 'upload', 'patch', 'delete', 'usage']);
    apiMock.list.and.returnValue(of(makePage([])));

    await TestBed.configureTestingModule({
      imports: [ImagePickerComponent, FormsModule],
      providers: [{ provide: MediaApiService, useValue: apiMock }],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ImagePickerComponent);
    component = fixture.componentInstance;
  });

  it('does not render modal when open=false', () => {
    component.open = false;
    fixture.detectChanges();
    const modal = fixture.nativeElement.querySelector('.picker-modal');
    expect(modal).toBeNull();
  });

  it('renders modal when open=true', fakeAsync(() => {
    apiMock.list.and.returnValue(of(makePage([makeAsset()])));
    component.open = true;
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    const modal = fixture.nativeElement.querySelector('.picker-modal');
    expect(modal).not.toBeNull();
  }));

  it('renders asset thumbnails when open=true', fakeAsync(() => {
    const assets = [makeAsset({ id: 1, url: 'https://cdn.example.com/img1.jpeg' })];
    apiMock.list.and.returnValue(of(makePage(assets)));
    component.open = true;
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    const thumbs: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.picker-thumb'));
    expect(thumbs.length).toBe(1);
  }));

  it('emits (selected) when an asset thumbnail is clicked', fakeAsync(() => {
    const asset = makeAsset({ id: 42, url: 'https://cdn.example.com/chosen.jpeg' });
    apiMock.list.and.returnValue(of(makePage([asset])));
    component.open = true;
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const selectedItems: MediaAsset[] = [];
    component.selected.subscribe(a => selectedItems.push(a));

    const thumbBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.picker-thumb');
    thumbBtn.click();

    expect(selectedItems.length).toBe(1);
    expect(selectedItems[0].id).toBe(42);
  }));

  it('emits (closed) when close button is clicked', fakeAsync(() => {
    apiMock.list.and.returnValue(of(makePage([])));
    component.open = true;
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const closedSpy = jasmine.createSpy('closed');
    component.closed.subscribe(closedSpy);

    const closeBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.picker-close-btn');
    closeBtn.click();

    expect(closedSpy).toHaveBeenCalled();
  }));

  it('emits (closed) when backdrop is clicked', fakeAsync(() => {
    apiMock.list.and.returnValue(of(makePage([])));
    component.open = true;
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const closedSpy = jasmine.createSpy('closed');
    component.closed.subscribe(closedSpy);

    const backdrop: HTMLElement = fixture.nativeElement.querySelector('.picker-backdrop');
    backdrop.click();

    expect(closedSpy).toHaveBeenCalled();
  }));

  it('search input change triggers new HTTP call', fakeAsync(() => {
    apiMock.list.and.returnValue(of(makePage([])));
    component.open = true;
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    apiMock.list.calls.reset();
    apiMock.list.and.returnValue(of(makePage([])));

    component['search'] = 'study';
    component['onSearchChange']();
    tick();

    expect(apiMock.list).toHaveBeenCalled();
    const callArgs = apiMock.list.calls.mostRecent().args;
    expect(callArgs[0]).toBe('study');
  }));

  it('shows empty message when no assets returned', fakeAsync(() => {
    apiMock.list.and.returnValue(of(makePage([])));
    component.open = true;
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const emptyEl: HTMLElement = fixture.nativeElement.querySelector('.picker-empty');
    expect(emptyEl).not.toBeNull();
  }));
});
