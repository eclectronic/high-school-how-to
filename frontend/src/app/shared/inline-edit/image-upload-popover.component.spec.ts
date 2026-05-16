import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { ImageUploadPopoverComponent, UploadedImageResult } from './image-upload-popover.component';
import { ContentApiService } from '../../core/services/content-api.service';

describe('ImageUploadPopoverComponent', () => {
  let fixture: ComponentFixture<ImageUploadPopoverComponent>;
  let component: ImageUploadPopoverComponent;
  let apiMock: jasmine.SpyObj<ContentApiService>;

  const makeFile = (name: string, type = 'image/jpeg') =>
    new File(['fake-bytes'], name, { type });

  beforeEach(async () => {
    apiMock = jasmine.createSpyObj('ContentApiService', ['adminUploadImage']);

    await TestBed.configureTestingModule({
      imports: [ImageUploadPopoverComponent, FormsModule],
      providers: [{ provide: ContentApiService, useValue: apiMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(ImageUploadPopoverComponent);
    component = fixture.componentInstance;
    component.file = makeFile('my-photo.jpeg');
    fixture.detectChanges();
  });

  // ── previewFilename ────────────────────────────────────────────────────────

  it('previewFilename uses sanitized filename when no title is set', () => {
    // No title set; falls back to file name
    const preview = (component as any).previewFilename as string;
    expect(preview).toContain('my-photo');
    expect(preview.endsWith('.jpeg')).toBeTrue();
  });

  it('previewFilename uses title when title is set', fakeAsync(async () => {
    component['title'] = 'Study Tips Cover';
    fixture.detectChanges();
    tick();
    const preview = (component as any).previewFilename as string;
    expect(preview).toBe('study-tips-cover.jpeg');
  }));

  it('live filename preview updates when title input changes', fakeAsync(async () => {
    const titleInput: HTMLInputElement = fixture.nativeElement.querySelector('input[type="text"]');
    titleInput.value = 'New Title';
    titleInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    const previewEl: HTMLElement = fixture.nativeElement.querySelector('.upload-popover__preview-label strong');
    expect(previewEl).not.toBeNull();
  }));

  // ── Upload success ─────────────────────────────────────────────────────────

  it('Upload button calls adminUploadImage with file', fakeAsync(() => {
    apiMock.adminUploadImage.and.returnValue(of({ url: '/uploads/foo.jpeg', thumbnailUrl: '/uploads/foo-thumb.jpeg' }));

    const uploadBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.upload-popover__btn--upload');
    uploadBtn.click();
    tick();

    expect(apiMock.adminUploadImage).toHaveBeenCalledWith(jasmine.any(File), undefined);
  }));

  it('emits (uploaded) with url and thumbnailUrl on success', fakeAsync(() => {
    apiMock.adminUploadImage.and.returnValue(of({ url: '/uploads/foo.jpeg', thumbnailUrl: '/thumbs/foo.jpeg' }));
    const results: UploadedImageResult[] = [];
    component.uploaded.subscribe(r => results.push(r));

    const uploadBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.upload-popover__btn--upload');
    uploadBtn.click();
    tick();

    expect(results.length).toBe(1);
    expect(results[0].url).toBe('/uploads/foo.jpeg');
    expect(results[0].thumbnailUrl).toBe('/thumbs/foo.jpeg');
  }));

  // ── 409 conflict ──────────────────────────────────────────────────────────

  it('shows conflict message on 409 response', fakeAsync(() => {
    apiMock.adminUploadImage.and.returnValue(
      throwError(() => ({
        status: 409,
        error: { existingUrl: '/uploads/study-tips.jpeg', message: "A file named 'study-tips.jpeg' already exists." },
      }))
    );

    const uploadBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.upload-popover__btn--upload');
    uploadBtn.click();
    tick();
    fixture.detectChanges();

    const conflictDiv: HTMLElement = fixture.nativeElement.querySelector('.upload-popover__conflict');
    expect(conflictDiv).not.toBeNull();
  }));

  it('"Use existing" button emits (uploaded) with existingUrl without HTTP call', fakeAsync(() => {
    apiMock.adminUploadImage.and.returnValue(
      throwError(() => ({
        status: 409,
        error: { existingUrl: '/uploads/study-tips.jpeg', message: 'Already exists.' },
      }))
    );

    const uploadBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.upload-popover__btn--upload');
    uploadBtn.click();
    tick();
    fixture.detectChanges();

    const results: UploadedImageResult[] = [];
    component.uploaded.subscribe(r => results.push(r));

    const useExistingBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.upload-popover__use-existing');
    expect(useExistingBtn).not.toBeNull();
    useExistingBtn.click();
    tick();

    expect(results.length).toBe(1);
    expect(results[0].url).toBe('/uploads/study-tips.jpeg');
    // No second HTTP call should be made
    expect(apiMock.adminUploadImage).toHaveBeenCalledTimes(1);
  }));

  // ── Cancel ────────────────────────────────────────────────────────────────

  it('Cancel button emits (cancelled) without making HTTP call', () => {
    const cancelledSpy = jasmine.createSpy('cancelled');
    component.cancelled.subscribe(cancelledSpy);

    const cancelBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.upload-popover__btn--cancel');
    cancelBtn.click();

    expect(cancelledSpy).toHaveBeenCalled();
    expect(apiMock.adminUploadImage).not.toHaveBeenCalled();
  });
});
