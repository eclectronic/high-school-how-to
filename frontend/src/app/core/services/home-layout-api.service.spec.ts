import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { HomeLayoutApiService } from './home-layout-api.service';
import { HomeSection } from '../models/home-layout.models';

describe('HomeLayoutApiService', () => {
  let service: HomeLayoutApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(HomeLayoutApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loadSections sets sections signal on success', () => {
    const mockSections: HomeSection[] = [
      { id: 1, sortOrder: 1, layout: 'split', slot1Tag: 'home-how-to', slot2Tag: 'home-locker' },
      { id: 2, sortOrder: 2, layout: 'full', slot1Tag: 'home-video', slot2Tag: null },
    ];

    service.loadSections();
    const req = httpMock.expectOne('/api/home-layout');
    expect(req.request.method).toBe('GET');
    req.flush(mockSections);

    expect(service.sections()).toEqual(mockSections);
  });

  it('adminList calls GET /api/admin/home-layout', () => {
    service.adminList().subscribe();
    const req = httpMock.expectOne('/api/admin/home-layout');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('adminSave calls PUT /api/admin/home-layout', () => {
    const payload = [{ layout: 'full' as const, slot1Tag: 'home-video', slot2Tag: null }];
    service.adminSave(payload).subscribe();
    const req = httpMock.expectOne('/api/admin/home-layout');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush([]);
  });
});
