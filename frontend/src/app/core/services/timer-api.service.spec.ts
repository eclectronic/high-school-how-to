import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TimerApiService } from './timer-api.service';
import { Timer } from '../models/task.models';

function makeTimer(overrides: Partial<Timer> = {}): Timer {
  return {
    id: 'timer-1',
    title: 'Timer',
    color: '#fffef8',
    focusDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    sessionsBeforeLongBreak: 4,
    ...overrides,
  };
}

describe('TimerApiService', () => {
  let service: TimerApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TimerApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getTimers calls GET /api/timers', () => {
    const timers = [makeTimer()];
    service.getTimers().subscribe(result => expect(result).toEqual(timers));
    http.expectOne('/api/timers').flush(timers);
  });

  it('createTimer calls POST /api/timers', () => {
    const timer = makeTimer();
    service.createTimer({ title: 'Timer' }).subscribe(result => expect(result).toEqual(timer));
    const req = http.expectOne('/api/timers');
    expect(req.request.method).toBe('POST');
    req.flush(timer);
  });

  it('updateTimer calls PUT /api/timers/{id}', () => {
    const timer = makeTimer({ title: 'Updated' });
    service.updateTimer('timer-1', { title: 'Updated' }).subscribe(result => expect(result).toEqual(timer));
    const req = http.expectOne('/api/timers/timer-1');
    expect(req.request.method).toBe('PUT');
    req.flush(timer);
  });

  it('deleteTimer calls DELETE /api/timers/{id}', () => {
    service.deleteTimer('timer-1').subscribe();
    const req = http.expectOne('/api/timers/timer-1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
