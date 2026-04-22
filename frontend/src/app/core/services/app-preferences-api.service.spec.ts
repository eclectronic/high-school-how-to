import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AppPreferencesApiService, AppPreferences } from './app-preferences-api.service';

const stubPreferences: AppPreferences = {
  activeApps: ['TODO', 'NOTES'],
  paneOrder: ['TODO', 'NOTES'],
  paletteName: 'ocean',
  lockerColor: null,
  fontFamily: null,
  lockerTextSize: 'DEFAULT',
  appColors: null,
};

describe('AppPreferencesApiService', () => {
  let service: AppPreferencesApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AppPreferencesApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AppPreferencesApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getPreferences sends GET /api/locker/app-preferences', () => {
    let result: AppPreferences | undefined;
    service.getPreferences().subscribe((r) => (result = r));

    const req = http.expectOne('/api/locker/app-preferences');
    expect(req.request.method).toBe('GET');
    req.flush(stubPreferences);

    expect(result).toEqual(stubPreferences);
  });

  it('updatePreferences sends PUT /api/locker/app-preferences with the request body', () => {
    const update: Partial<AppPreferences> = { paletteName: 'sunset' };
    let result: AppPreferences | undefined;
    service.updatePreferences(update).subscribe((r) => (result = r));

    const req = http.expectOne('/api/locker/app-preferences');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(update);
    req.flush({ ...stubPreferences, paletteName: 'sunset' });

    expect(result?.paletteName).toBe('sunset');
  });

  it('updatePreferences sends the full preferences object when provided', () => {
    service.updatePreferences(stubPreferences).subscribe();

    const req = http.expectOne('/api/locker/app-preferences');
    expect(req.request.body).toEqual(stubPreferences);
    req.flush(stubPreferences);
  });
});
