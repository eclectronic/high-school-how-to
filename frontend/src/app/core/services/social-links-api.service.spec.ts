import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { SocialLinksApiService } from './social-links-api.service';

describe('SocialLinksApiService', () => {
  let service: SocialLinksApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SocialLinksApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loadPublicLinks calls GET /api/social-links and updates signal', () => {
    const mockLinks = [
      { id: 1, platform: 'INSTAGRAM', displayName: 'Instagram', url: 'https://ig.com', displayOrder: 1 },
    ];
    service.loadPublicLinks();
    const req = httpMock.expectOne('/api/social-links');
    expect(req.request.method).toBe('GET');
    req.flush(mockLinks);
    expect(service.links()).toEqual(mockLinks);
  });

  it('loadPublicLinks handles errors gracefully', () => {
    service.loadPublicLinks();
    const req = httpMock.expectOne('/api/social-links');
    req.flush('Error', { status: 500, statusText: 'Server Error' });
    expect(service.links()).toEqual([]);
  });

  it('listAdmin calls GET /api/admin/social-links', () => {
    service.listAdmin().subscribe();
    const req = httpMock.expectOne('/api/admin/social-links');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('update calls PUT /api/admin/social-links/:id', () => {
    const updateReq = { url: 'https://new.url', enabled: true, displayOrder: 1 };
    service.update(1, updateReq).subscribe();
    const req = httpMock.expectOne('/api/admin/social-links/1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(updateReq);
    req.flush({
      id: 1,
      platform: 'INSTAGRAM',
      displayName: 'Instagram',
      url: 'https://new.url',
      displayOrder: 1,
      enabled: true,
    });
  });
});
