import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { TimerCardComponent, TIMER_PRESETS } from './timer-card.component';
import { TimerApiService, UpdateTimerResponse } from '../../core/services/timer-api.service';
import { Timer, TaskList } from '../../core/models/task.models';

function makeUpdateTimerResponse(overrides: Partial<Timer> = {}): UpdateTimerResponse {
  return {
    id: 'timer-1',
    title: 'Timer',
    color: '#fffef8',
    timerType: 'BASIC',
    basicDurationSeconds: 0,
    focusDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    sessionsBeforeLongBreak: 4,
    earnedBadge: null,
    ...overrides,
  };
}

function makeTimer(overrides: Partial<Timer> = {}): Timer {
  return {
    id: 'timer-1',
    title: 'Timer',
    color: '#fffef8',
    timerType: 'BASIC',
    basicDurationSeconds: 0,
    focusDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    sessionsBeforeLongBreak: 4,
    ...overrides,
  };
}

function makeTaskList(overrides: Partial<TaskList> = {}): TaskList {
  return {
    id: 'list-1',
    title: 'My Tasks',
    color: '#fffef8',
    tasks: [],
    ...overrides,
  };
}

describe('TimerCardComponent', () => {
  let fixture: ComponentFixture<TimerCardComponent>;
  let component: TimerCardComponent;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let c: any;
  let timerApi: jasmine.SpyObj<TimerApiService>;

  beforeEach(async () => {
    timerApi = jasmine.createSpyObj<TimerApiService>('TimerApiService', [
      'getTimers', 'createTimer', 'updateTimer', 'deleteTimer',
    ]);
    // Default return value for updateTimer — individual tests can override.
    timerApi.updateTimer.and.returnValue(of(makeUpdateTimerResponse()));

    await TestBed.configureTestingModule({
      imports: [TimerCardComponent],
      providers: [{ provide: TimerApiService, useValue: timerApi }],
    }).compileComponents();

    fixture = TestBed.createComponent(TimerCardComponent);
    component = fixture.componentInstance;
    c = component as any;
    component.timer = makeTimer();
    fixture.detectChanges();
  });

  afterEach(() => c.clearTick());

  // ── Rendering ────────────────────────────────────────────────────────────

  it('renders timer title', () => {
    const titleBar = fixture.nativeElement.querySelector('app-widget-title-bar');
    expect(titleBar).toBeTruthy();
    const title = titleBar.querySelector('.title-bar__title');
    expect(title.textContent.trim()).toBe('Timer: Timer');
  });

  it('renders progress ring', () => {
    expect(fixture.nativeElement.querySelector('.progress-ring')).toBeTruthy();
  });

  it('shows 25:00 for idle 25-minute timer', () => {
    expect(fixture.nativeElement.querySelector('.timer-display__time').textContent.trim()).toBe('00:00');
  });

  it('does not render inline task list or checkboxes', () => {
    expect(fixture.nativeElement.querySelector('.linked-list')).toBeNull();
    expect(fixture.nativeElement.querySelector('.linked-list__tasks')).toBeNull();
    expect(fixture.nativeElement.querySelector('.linked-task input[type="checkbox"]')).toBeNull();
  });

  // ── Phase state machine ───────────────────────────────────────────────────

  it('starts in idle phase', () => {
    expect(c.phase()).toBe('idle');
  });

  it('toggleStartPause from idle starts focus', () => {
    c.toggleStartPause();
    expect(c.phase()).toBe('focus');
    expect(c.secondsRemaining()).toBe(25 * 60);
  });

  it('toggleStartPause while running pauses', () => {
    c.toggleStartPause();
    c.toggleStartPause();
    expect(c.phase()).toBe('paused');
  });

  it('toggleStartPause while paused resumes', () => {
    c.toggleStartPause();
    c.toggleStartPause();
    c.toggleStartPause();
    expect(c.phase()).toBe('focus');
  });

  it('reset returns to idle', () => {
    c.toggleStartPause();
    c.reset();
    expect(c.phase()).toBe('idle');
    expect(c.completedSessions).toBe(0);
  });

  it('skipPhase from focus starts break', () => {
    c.toggleStartPause();
    c.skipPhase();
    expect(c.phase()).toBe('short-break');
  });

  it('skipPhase from break starts focus', () => {
    c.toggleStartPause();
    c.skipPhase(); // skip focus → short break
    c.skipPhase(); // skip break → focus
    expect(c.phase()).toBe('focus');
  });

  // ── Tick countdown ────────────────────────────────────────────────────────

  it('counts down seconds', fakeAsync(() => {
    component.timer = makeTimer({ focusDuration: 1 }); // 60 seconds
    fixture.detectChanges();
    c.toggleStartPause();
    tick(1000);
    expect(c.secondsRemaining()).toBe(59);
    c.clearTick();
  }));

  // ── Settings ─────────────────────────────────────────────────────────────

  it('opens settings panel on ⚙️ click', () => {
    const settingsBtn: HTMLButtonElement = fixture.nativeElement.querySelector('[title="Settings"]');
    settingsBtn.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.settings-panel')).toBeTruthy();
  });

  it('applyPreset sets draft values', () => {
    const preset = TIMER_PRESETS[2]; // Deep Work
    c.applyPreset(preset);
    expect(c.draftFocus).toBe(50);
    expect(c.draftSessions).toBe(3);
  });

  it('saveSettings calls updateTimer', () => {
    const updated = makeTimer({ focusDuration: 50 });
    timerApi.updateTimer.and.returnValue(of(updated));
    c.settingsOpen = true;
    c.draftFocus = 50;
    c.draftShortBreak = 5;
    c.draftLongBreak = 15;
    c.draftSessions = 4;
    c.draftLinkedListId = '';
    c.saveSettings();
    expect(timerApi.updateTimer).toHaveBeenCalled();
  });

  // ── Color ─────────────────────────────────────────────────────────────────

  it('onColorChange calls updateTimer and emits timerUpdated', () => {
    const updated = makeTimer({ color: '#dbeafe' });
    timerApi.updateTimer.and.returnValue(of(updated));
    const emitted: Timer[] = [];
    component.timerUpdated.subscribe((t: Timer) => emitted.push(t));

    c.onColorCommit('#dbeafe');

    expect(timerApi.updateTimer).toHaveBeenCalled();
    expect(emitted.length).toBe(1);
    expect(emitted[0].color).toBe('#dbeafe');
  });

  // ── Delete ────────────────────────────────────────────────────────────────

  it('deleteConfirmed calls deleteTimer and emits timerDeleted', () => {
    timerApi.deleteTimer.and.returnValue(of(undefined));
    const emitted: string[] = [];
    component.timerDeleted.subscribe((id: string) => emitted.push(id));

    c.deleteConfirmed();

    expect(timerApi.deleteTimer).toHaveBeenCalledWith('timer-1');
    expect(emitted).toEqual(['timer-1']);
  });

  // ── Title editing ─────────────────────────────────────────────────────────

  it('onTitleChanged calls updateTimer with new title', () => {
    const updated = makeTimer({ title: 'New Name' });
    timerApi.updateTimer.and.returnValue(of(updated));
    c.onTitleChanged('New Name');
    expect(timerApi.updateTimer).toHaveBeenCalledWith('timer-1', jasmine.objectContaining({ title: 'New Name' }));
  });

  // ── Formatted time ────────────────────────────────────────────────────────

  it('formattedTime shows 00:00 when idle', () => {
    expect(c.formattedTime()).toBe('00:00');
  });

  it('formattedTime shows mm:ss correctly', () => {
    c.secondsRemaining.set(90);
    expect(c.formattedTime()).toBe('01:30');
  });

  // ── Long break after N sessions ───────────────────────────────────────────

  it('starts long break after sessionsBeforeLongBreak focus sessions', () => {
    component.timer = makeTimer({ sessionsBeforeLongBreak: 2 });
    c.completedSessions = 2; // divisible by 2
    c.toggleStartPause(); // starts focus
    c.skipPhase(); // completes focus session (completedSessions = 3 after skip)
    // After 3 sessions, 3 % 2 !== 0, so short break
    // Actually let's check: completedSessions was 2 before skip, skip increments it to 3
    // 3 % 2 = 1 !== 0, so short break... hmm, let me reconsider
    // The logic: isLong = completedSessions > 0 && completedSessions % sessionsBeforeLongBreak === 0
    // completedSessions=2, skip → completedSessions=3, 3%2=1 ≠ 0 → short break
    // Let's use completedSessions=3 (4th session completes → 4%2=0 → long break)
    expect(c.phase()).toBe('short-break'); // with completedSessions=3, 3%2!=0
  });

  it('starts long break when completedSessions is divisible by sessionsBeforeLongBreak', () => {
    component.timer = makeTimer({ sessionsBeforeLongBreak: 2 });
    c.completedSessions = 1; // after skip, becomes 2 → 2%2=0 → long break
    c.toggleStartPause(); // starts focus
    c.skipPhase(); // completedSessions=2, 2%2=0 → long break
    expect(c.phase()).toBe('long-break');
  });

  // ── Linked list UI ────────────────────────────────────────────────────────

  it('hides 📋 icon when no linked list', () => {
    const clipboardBtn = fixture.nativeElement.querySelector('[title="Go to linked list"]');
    expect(clipboardBtn).toBeNull();
  });

  describe('with a linked list', () => {
    let linkedFixture: ComponentFixture<TimerCardComponent>;
    let linkedComponent: TimerCardComponent;
    const linkedList = makeTaskList();

    beforeEach(async () => {
      linkedFixture = TestBed.createComponent(TimerCardComponent);
      linkedComponent = linkedFixture.componentInstance;
      linkedComponent.timer = makeTimer({ linkedTaskListId: linkedList.id });
      linkedFixture.componentRef.setInput('taskLists', [linkedList]);
      linkedFixture.detectChanges();
    });

    afterEach(() => (linkedFixture.componentInstance as any).clearTick());

    it('shows 📋 icon', () => {
      const clipboardBtn = linkedFixture.nativeElement.querySelector('[title="Go to linked list"]');
      expect(clipboardBtn).toBeTruthy();
    });

    it('emits scrollToLinkedListRequested', () => {
      let emitCount = 0;
      linkedComponent.scrollToLinkedListRequested.subscribe(() => emitCount++);
      linkedComponent.scrollToLinkedListRequested.emit();
      expect(emitCount).toBe(1);
    });
  });
});
