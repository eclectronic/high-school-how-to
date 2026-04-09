import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { LockerLayoutApiService } from './locker-layout-api.service';
import { LockerLayoutItem } from '../models/task.models';

describe('LockerLayoutApiService', () => {
  let service: LockerLayoutApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LockerLayoutApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LockerLayoutApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getLayout sends GET to /api/locker/layout', () => {
    service.getLayout().subscribe();
    const req = http.expectOne('/api/locker/layout');
    expect(req.request.method).toBe('GET');
    req.flush([] as LockerLayoutItem[]);
  });

  it('saveLayout sends POST with items', () => {
    const items: LockerLayoutItem[] = [
      { cardType: 'TASK_LIST', cardId: 'abc', col: 1, colSpan: 4, order: 0, minimized: false },
    ];
    service.saveLayout(items).subscribe();
    const req = http.expectOne('/api/locker/layout');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ items });
    req.flush(items);
  });
});
