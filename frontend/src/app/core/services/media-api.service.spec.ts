import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { MediaApiService, MediaAsset, MediaPage } from './media-api.service';

describe('MediaApiService', () => {
  let service: MediaApiService;
  let http: HttpTestingController;

  const mockAsset: MediaAsset = {
    id: 1,
    url: 'https://cdn.example.com/img1.jpeg',
    filename: 'img1.jpeg',
    altText: 'Alt text',
    mimeType: 'image/jpeg',
    sizeBytes: 1024,
    width: 100,
    height: 100,
    uploadedAt: '2026-01-01T00:00:00Z',
  };

  const mockPage: MediaPage = {
    content: [mockAsset],
    totalElements: 1,
    totalPages: 1,
    number: 0,
    size: 48,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MediaApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MediaApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  // ── list() ───────────────────────────────────────────────────────────────

  it('list() makes GET to /api/admin/media with default params', () => {
    service.list().subscribe();
    const req = http.expectOne(r => r.url === '/api/admin/media');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('search')).toBe('');
    expect(req.request.params.get('page')).toBe('0');
    req.flush(mockPage);
  });

  it('list() passes search, page, and size params', () => {
    service.list('study', 2, 24).subscribe();
    const req = http.expectOne(r => r.url === '/api/admin/media');
    expect(req.request.params.get('search')).toBe('study');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('size')).toBe('24');
    req.flush(mockPage);
  });

  // ── upload() ─────────────────────────────────────────────────────────────

  it('upload() makes POST multipart to /api/admin/media', () => {
    const file = new File(['data'], 'img.jpeg', { type: 'image/jpeg' });
    service.upload(file).subscribe();
    const req = http.expectOne('/api/admin/media');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeInstanceOf(FormData);
    req.flush(mockAsset);
  });

  it('upload() includes title in FormData when provided', () => {
    const file = new File(['data'], 'img.jpeg', { type: 'image/jpeg' });
    service.upload(file, 'images', 'Study Tips').subscribe();
    const req = http.expectOne('/api/admin/media');
    const form: FormData = req.request.body;
    expect(form.get('title')).toBe('Study Tips');
    req.flush(mockAsset);
  });

  it('upload() does not include title when not provided', () => {
    const file = new File(['data'], 'img.jpeg', { type: 'image/jpeg' });
    service.upload(file, 'images').subscribe();
    const req = http.expectOne('/api/admin/media');
    const form: FormData = req.request.body;
    expect(form.get('title')).toBeNull();
    req.flush(mockAsset);
  });

  it('upload() includes subfolder in FormData', () => {
    const file = new File(['data'], 'badge.png', { type: 'image/png' });
    service.upload(file, 'badges').subscribe();
    const req = http.expectOne('/api/admin/media');
    const form: FormData = req.request.body;
    expect(form.get('subfolder')).toBe('badges');
    req.flush(mockAsset);
  });

  // ── patch() ───────────────────────────────────────────────────────────────

  it('patch() makes PATCH to /api/admin/media/{id}', () => {
    service.patch(7, 'New alt', 'new-name.jpeg').subscribe();
    const req = http.expectOne('/api/admin/media/7');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ altText: 'New alt', filename: 'new-name.jpeg' });
    req.flush(mockAsset);
  });

  // ── delete() ─────────────────────────────────────────────────────────────

  it('delete() makes DELETE to /api/admin/media/{id}', () => {
    service.delete(5).subscribe();
    const req = http.expectOne('/api/admin/media/5');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  // ── usage() ───────────────────────────────────────────────────────────────

  it('usage() makes GET to /api/admin/media/{id}/usage', () => {
    service.usage(3).subscribe();
    const req = http.expectOne('/api/admin/media/3/usage');
    expect(req.request.method).toBe('GET');
    req.flush({ count: 0, cards: [] });
  });
});
