import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import {
  LockerComponent,
  nextAutoName,
  LOCKER_FONTS,
  LockerFont,
  LOCKER_FONT_SIZES,
} from './locker.component';
import { TaskApiService } from '../../../core/services/task-api.service';
import { TimerApiService } from '../../../core/services/timer-api.service';
import { NoteApiService } from '../../../core/services/note-api.service';
import { ShortcutApiService } from '../../../core/services/shortcut-api.service';
import { StickerApiService } from '../../../core/services/sticker-api.service';
import { LockerLayoutApiService } from '../../../core/services/locker-layout-api.service';
import { TaskList, TaskItem, Timer, Note, Shortcut, Sticker } from '../../../core/models/task.models';
import { RouterTestingModule } from '@angular/router/testing';

const MOCK_FONT_KEY = 'hsht_lockerFontId';
const MOCK_FONT_SIZE_KEY = 'hsht_lockerFontSize';

function makeList(overrides: Partial<TaskList> = {}): TaskList {
  return { id: 'list-1', title: 'To-dos', tasks: [], color: '#fef3c7', textColor: null, ...overrides };
}

function makeTask(overrides: Partial<TaskItem> = {}): TaskItem {
  return { id: 'task-1', description: 'Do something', completed: false, dueAt: null, ...overrides };
}

function makeTimer(overrides: Partial<Timer> = {}): Timer {
  return {
    id: 'timer-1', title: 'Timer', color: '#fffef8',
    focusDuration: 25, shortBreakDuration: 5, longBreakDuration: 15, sessionsBeforeLongBreak: 4,
    ...overrides,
  };
}

function makeNote(overrides: Partial<Note> = {}): Note {
  return { id: 'note-1', title: 'Note', color: '#fef3c7', content: null, textColor: null, fontSize: null, ...overrides };
}

function makeShortcut(overrides: Partial<Shortcut> = {}): Shortcut {
  return { id: 'sc-1', url: 'https://example.com', name: 'Example', ...overrides };
}

function makeSticker(overrides: Partial<Sticker> = {}): Sticker {
  return { id: 'sticker-1', emoji: '⭐', iconUrl: null, label: null, createdAt: '', updatedAt: '', ...overrides };
}

describe('nextAutoName (pure function)', () => {
  it('returns base name when not used', () => {
    expect(nextAutoName([], 'To-dos')).toBe('To-dos');
    expect(nextAutoName(['Other'], 'To-dos')).toBe('To-dos');
  });

  it('returns #2 when base name is taken', () => {
    expect(nextAutoName(['To-dos'], 'To-dos')).toBe('To-dos #2');
  });

  it('fills gap #2 when #3 is taken but #2 is not', () => {
    expect(nextAutoName(['To-dos', 'To-dos #3'], 'To-dos')).toBe('To-dos #2');
  });

  it('uses next available number when #2 and #3 are both taken', () => {
    expect(nextAutoName(['To-dos', 'To-dos #2', 'To-dos #3'], 'To-dos')).toBe('To-dos #4');
  });

  it('escapes regex special characters in base name', () => {
    const result = nextAutoName(['Math (AP)', 'Math (AP) #2'], 'Math (AP)');
    expect(result).toBe('Math (AP) #3');
  });
});

describe('LockerComponent', () => {
  let fixture: ComponentFixture<LockerComponent>;
  let component: LockerComponent;
  let taskApi: jasmine.SpyObj<TaskApiService>;
  let timerApi: jasmine.SpyObj<TimerApiService>;
  let noteApi: jasmine.SpyObj<NoteApiService>;
  let shortcutApi: jasmine.SpyObj<ShortcutApiService>;
  let stickerApi: jasmine.SpyObj<StickerApiService>;
  let lockerLayoutApi: jasmine.SpyObj<LockerLayoutApiService>;

  beforeEach(async () => {
    localStorage.removeItem(MOCK_FONT_KEY);
    localStorage.removeItem(MOCK_FONT_SIZE_KEY);

    taskApi = jasmine.createSpyObj<TaskApiService>('TaskApiService', [
      'getTaskLists', 'createList', 'deleteList', 'addTask',
      'updateTask', 'deleteTask', 'updateListTitle', 'updateListColor',
      'updateTaskDueDate', 'reorderTasks',
    ]);
    timerApi = jasmine.createSpyObj<TimerApiService>('TimerApiService', [
      'getTimers', 'createTimer', 'updateTimer', 'deleteTimer',
    ]);
    noteApi = jasmine.createSpyObj<NoteApiService>('NoteApiService', [
      'getNotes', 'createNote', 'updateNote', 'deleteNote',
    ]);
    shortcutApi = jasmine.createSpyObj<ShortcutApiService>('ShortcutApiService', [
      'getShortcuts', 'createShortcut', 'updateShortcut', 'deleteShortcut',
      'getMetadata', 'importShortcuts', 'exportShortcuts',
    ]);
    stickerApi = jasmine.createSpyObj<StickerApiService>('StickerApiService', [
      'getStickers', 'createSticker', 'updateSticker', 'deleteSticker',
    ]);
    lockerLayoutApi = jasmine.createSpyObj<LockerLayoutApiService>('LockerLayoutApiService', [
      'getLayout', 'saveLayout',
    ]);

    taskApi.getTaskLists.and.returnValue(of([]));
    timerApi.getTimers.and.returnValue(of([]));
    noteApi.getNotes.and.returnValue(of([]));
    shortcutApi.getShortcuts.and.returnValue(of([]));
    stickerApi.getStickers.and.returnValue(of([]));
    lockerLayoutApi.getLayout.and.returnValue(of([]));
    lockerLayoutApi.saveLayout.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [LockerComponent, RouterTestingModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TaskApiService, useValue: taskApi },
        { provide: TimerApiService, useValue: timerApi },
        { provide: NoteApiService, useValue: noteApi },
        { provide: ShortcutApiService, useValue: shortcutApi },
        { provide: StickerApiService, useValue: stickerApi },
        { provide: LockerLayoutApiService, useValue: lockerLayoutApi },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.removeItem(MOCK_FONT_KEY);
    localStorage.removeItem(MOCK_FONT_SIZE_KEY);
  });

  const render = (lists: TaskList[] = [], timers: Timer[] = [], notes: Note[] = [], shortcuts: Shortcut[] = []) => {
    taskApi.getTaskLists.and.returnValue(of(lists));
    timerApi.getTimers.and.returnValue(of(timers));
    noteApi.getNotes.and.returnValue(of(notes));
    shortcutApi.getShortcuts.and.returnValue(of(shortcuts));
    fixture = TestBed.createComponent(LockerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  // ── Auto-naming ──────────────────────────────────────────────────────────

  it('creates first list with title "To-dos"', () => {
    taskApi.createList.and.returnValue(of(makeList({ id: 'new', title: 'To-dos' })));
    render([]);

    component['createList']();

    expect(taskApi.createList).toHaveBeenCalledWith('To-dos', jasmine.any(String));
  });

  it('auto-names second list "To-dos #2" when "To-dos" exists', () => {
    taskApi.createList.and.returnValue(of(makeList({ id: 'new', title: 'To-dos #2' })));
    render([makeList({ title: 'To-dos' })]);

    component['createList']();

    expect(taskApi.createList).toHaveBeenCalledWith('To-dos #2', jasmine.any(String));
  });

  // ── atListLimit ──────────────────────────────────────────────────────────

  it('atListLimit is false below 20 lists', () => {
    const lists = Array.from({ length: 19 }, (_, i) => makeList({ id: `l${i}`, title: `List ${i}` }));
    render(lists);
    expect(component['atListLimit']()).toBeFalse();
  });

  it('atListLimit is true at 20 lists', () => {
    const lists = Array.from({ length: 20 }, (_, i) => makeList({ id: `l${i}`, title: `List ${i}` }));
    render(lists);
    expect(component['atListLimit']()).toBeTrue();
  });

  it('createList does nothing when at limit', () => {
    const lists = Array.from({ length: 20 }, (_, i) => makeList({ id: `l${i}`, title: `List ${i}` }));
    render(lists);

    component['createList']();

    expect(taskApi.createList).not.toHaveBeenCalled();
  });

  // ── Confirm dialogs ──────────────────────────────────────────────────────

  it('requestDelete sets confirmDeleteList', () => {
    const list = makeList();
    render([list]);

    component['requestDelete'](list);

    expect(component['confirmDeleteList']).toBe(list);
  });

  it('onCancelDeleteList clears confirmDeleteList', () => {
    render([]);
    component['confirmDeleteList'] = makeList();

    component['onCancelDeleteList']();

    expect(component['confirmDeleteList']).toBeNull();
  });

  it('onConfirmDeleteList calls deleteList and clears dialog', () => {
    const list = makeList();
    taskApi.deleteList.and.returnValue(of(void 0));
    render([list]);
    component['confirmDeleteList'] = list;

    component['onConfirmDeleteList']();

    expect(taskApi.deleteList).toHaveBeenCalledWith(list.id);
    expect(component['confirmDeleteList']).toBeNull();
  });

  it('requestClean sets confirmCleanList when completed tasks exist', () => {
    const list = makeList({ tasks: [makeTask({ completed: true })] });
    render([list]);

    component['requestClean'](list);

    expect(component['confirmCleanList']).toBe(list);
  });

  it('requestClean does nothing when no completed tasks', () => {
    const list = makeList({ tasks: [makeTask({ completed: false })] });
    render([list]);

    component['requestClean'](list);

    expect(component['confirmCleanList']).toBeNull();
  });

  // ── Font setting ─────────────────────────────────────────────────────────

  it('setLockerFont saves to localStorage', () => {
    render([]);
    const font = LOCKER_FONTS[2]; // Patrick Hand

    component['setLockerFont'](font);

    expect(localStorage.getItem(MOCK_FONT_KEY)).toBe(font.id);
    expect(component['lockerFont']()).toBe(font);
  });

  it('setLockerFont applies CSS variable', () => {
    render([]);
    const font = LOCKER_FONTS[1]; // Nunito

    component['setLockerFont'](font);

    expect(document.documentElement.style.getPropertyValue('--locker-font')).toContain('Nunito');
  });

  it('setLockerFont closes font picker', () => {
    render([]);
    component['fontPickerOpen'] = true;

    component['setLockerFont'](LOCKER_FONTS[0]);

    expect(component['fontPickerOpen']).toBeFalse();
  });

  it('loadLockerFont returns saved font from localStorage', () => {
    localStorage.setItem(MOCK_FONT_KEY, 'fredoka');
    render([]);
    const font = component['lockerFont']();
    expect(font.id).toBe('fredoka');
  });

  // ── Due date formatting ───────────────────────────────────────────────────

  it('formatDueDate returns empty string for null', () => {
    render([]);
    expect(component['formatDueDate'](null)).toBe('');
  });

  it('formatDueDate returns "Today at …" for today', () => {
    render([]);
    const now = new Date();
    now.setHours(14, 30, 0, 0);
    const result = component['formatDueDate'](now.toISOString());
    expect(result).toContain('Today');
  });

  it('formatDueDate returns "Tomorrow at …" for tomorrow', () => {
    render([]);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const result = component['formatDueDate'](tomorrow.toISOString());
    expect(result).toContain('Tomorrow');
  });

  it('formatDueDate returns abbreviated date for other days', () => {
    render([]);
    const future = new Date('2030-06-15T10:00:00');
    const result = component['formatDueDate'](future.toISOString());
    expect(result).toContain('Jun');
    expect(result).toContain('15');
  });

  // ── isOverdue ─────────────────────────────────────────────────────────────

  it('isOverdue returns true for past uncompleted tasks', () => {
    render([]);
    const past = new Date(Date.now() - 3600_000).toISOString();
    const task = makeTask({ dueAt: past, completed: false });
    expect(component['isOverdue'](task)).toBeTrue();
  });

  it('isOverdue returns false for completed tasks', () => {
    render([]);
    const past = new Date(Date.now() - 3600_000).toISOString();
    const task = makeTask({ dueAt: past, completed: true });
    expect(component['isOverdue'](task)).toBeFalse();
  });

  it('isOverdue returns false for future tasks', () => {
    render([]);
    const future = new Date(Date.now() + 3600_000).toISOString();
    const task = makeTask({ dueAt: future, completed: false });
    expect(component['isOverdue'](task)).toBeFalse();
  });

  // ── cardTextColor ─────────────────────────────────────────────────────────

  it('cardTextColor returns explicit textColor when set', () => {
    render([]);
    const list = makeList({ color: '#ffffff', textColor: '#ff0000' });
    expect(component['cardTextColor'](list)).toBe('#ff0000');
  });

  it('cardTextColor auto-contrasts for light background', () => {
    render([]);
    const list = makeList({ color: '#ffffff', textColor: null });
    expect(component['cardTextColor'](list)).toBe('#000000');
  });

  it('cardTextColor auto-contrasts for dark background', () => {
    render([]);
    const list = makeList({ color: '#000000', textColor: null });
    expect(component['cardTextColor'](list)).toBe('#ffffff');
  });

  // ── createList emits layout save ─────────────────────────────────────────

  it('createList calls saveLayout after creating a list', () => {
    const newList = makeList({ id: 'new' });
    taskApi.createList.and.returnValue(of(newList));
    lockerLayoutApi.saveLayout.and.returnValue(of([]));
    render([]);

    component['createList']();

    expect(lockerLayoutApi.saveLayout).toHaveBeenCalled();
  });

  // ── Error handling ───────────────────────────────────────────────────────

  it('shows error message when createList fails', () => {
    taskApi.createList.and.returnValue(throwError(() => new Error('boom')));
    render([]);

    component['createList']();
    fixture.detectChanges();

    expect(component['errorMessage']).toContain('Unable to add a list');
  });

  // ── Timer creation ────────────────────────────────────────────────────────

  it('createTimer creates first timer with title "Timer"', () => {
    timerApi.createTimer.and.returnValue(of(makeTimer({ id: 'new', title: 'Timer' })));
    render([]);

    component['createTimer']();

    expect(timerApi.createTimer).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Timer' }));
  });

  it('createTimer auto-names second timer "Timer #2"', () => {
    timerApi.createTimer.and.returnValue(of(makeTimer({ id: 'new', title: 'Timer #2' })));
    render([], [makeTimer({ title: 'Timer' })]);

    component['createTimer']();

    expect(timerApi.createTimer).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Timer #2' }));
  });

  it('atTimerLimit is true at 10 timers', () => {
    const timers = Array.from({ length: 10 }, (_, i) => makeTimer({ id: `t${i}`, title: `Timer ${i}` }));
    render([], timers);
    expect(component['atTimerLimit']()).toBeTrue();
  });

  it('createTimer does nothing when at limit', () => {
    const timers = Array.from({ length: 10 }, (_, i) => makeTimer({ id: `t${i}`, title: `Timer ${i}` }));
    render([], timers);

    component['createTimer']();

    expect(timerApi.createTimer).not.toHaveBeenCalled();
  });

  // ── orderedCards ─────────────────────────────────────────────────────────

  it('orderedCards includes both task lists and timers', () => {
    render([makeList()], [makeTimer()]);
    const cards = component['orderedCards']();
    expect(cards.some(c => c.type === 'TASK_LIST')).toBeTrue();
    expect(cards.some(c => c.type === 'TIMER')).toBeTrue();
  });

  // ── Timer event handlers ──────────────────────────────────────────────────

  it('onTimerUpdated replaces timer in signal', () => {
    const timer = makeTimer();
    render([], [timer]);

    const updated = makeTimer({ title: 'Updated' });
    component['onTimerUpdated'](updated);

    expect(component['timers']().find(t => t.id === 'timer-1')?.title).toBe('Updated');
  });

  it('onTimerDeleted removes timer from signal', () => {
    render([], [makeTimer()]);

    component['onTimerDeleted']('timer-1');

    expect(component['timers']().length).toBe(0);
  });

  // ── Note creation ─────────────────────────────────────────────────────────

  it('createNote creates first note with title "Note"', () => {
    noteApi.createNote.and.returnValue(of(makeNote({ id: 'new', title: 'Note' })));
    render();

    component['createNote']();

    expect(noteApi.createNote).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Note' }));
  });

  it('createNote auto-names second note "Note #2"', () => {
    noteApi.createNote.and.returnValue(of(makeNote({ id: 'new', title: 'Note #2' })));
    render([], [], [makeNote({ title: 'Note' })]);

    component['createNote']();

    expect(noteApi.createNote).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Note #2' }));
  });

  it('atNoteLimit is true at 20 notes', () => {
    const notes = Array.from({ length: 20 }, (_, i) => makeNote({ id: `n${i}`, title: `Note ${i}` }));
    render([], [], notes);
    expect(component['atNoteLimit']()).toBeTrue();
  });

  it('createNote does nothing when at limit', () => {
    const notes = Array.from({ length: 20 }, (_, i) => makeNote({ id: `n${i}`, title: `Note ${i}` }));
    render([], [], notes);

    component['createNote']();

    expect(noteApi.createNote).not.toHaveBeenCalled();
  });

  it('onNoteUpdated replaces note in signal', () => {
    render([], [], [makeNote()]);

    component['onNoteUpdated'](makeNote({ title: 'Updated' }));

    expect(component['notes']().find(n => n.id === 'note-1')?.title).toBe('Updated');
  });

  it('onNoteDeleted removes note from signal', () => {
    render([], [], [makeNote()]);

    component['onNoteDeleted']('note-1');

    expect(component['notes']().length).toBe(0);
  });

  it('orderedCards includes notes', () => {
    render([], [], [makeNote()]);
    const cards = component['orderedCards']();
    expect(cards.some(c => c.type === 'NOTE')).toBeTrue();
  });

  // ── Study Session ─────────────────────────────────────────────────────────

  it('enterStudySession sets studySession signal for timer with linked list', () => {
    const list = makeList({ id: 'list-1' });
    const timer = makeTimer({ id: 'timer-1', linkedTaskListId: 'list-1' });
    render([list], [timer]);

    component['enterStudySession']('timer-1');

    expect(component['studySession']()).toEqual({ timerId: 'timer-1', listId: 'list-1' });
  });

  it('enterStudySession does nothing for timer without linked list', () => {
    const timer = makeTimer({ id: 'timer-1', linkedTaskListId: null });
    render([], [timer]);

    component['enterStudySession']('timer-1');

    expect(component['studySession']()).toBeNull();
  });

  it('exitStudySession clears studySession signal', () => {
    const list = makeList({ id: 'list-1' });
    const timer = makeTimer({ id: 'timer-1', linkedTaskListId: 'list-1' });
    render([list], [timer]);
    component['enterStudySession']('timer-1');

    component['exitStudySession']();

    expect(component['studySession']()).toBeNull();
  });

  it('studyReadyTimers returns timers that have a linked list', () => {
    const list = makeList({ id: 'list-1' });
    const timerLinked = makeTimer({ id: 'timer-1', linkedTaskListId: 'list-1' });
    const timerUnlinked = makeTimer({ id: 'timer-2', linkedTaskListId: null });
    render([list], [timerLinked, timerUnlinked]);

    const ready = component['studyReadyTimers']();
    expect(ready.length).toBe(1);
    expect(ready[0].id).toBe('timer-1');
  });

  // ── Shortcuts ─────────────────────────────────────────────────────────────

  it('atShortcutLimit is true at 50 shortcuts', () => {
    const shortcuts = Array.from({ length: 50 }, (_, i) =>
      makeShortcut({ id: `sc${i}`, url: `https://site${i}.com`, name: `Site ${i}` }));
    render([], [], [], shortcuts);
    expect(component['atShortcutLimit']()).toBeTrue();
  });

  it('atShortcutLimit is false below 50 shortcuts', () => {
    const shortcuts = Array.from({ length: 49 }, (_, i) =>
      makeShortcut({ id: `sc${i}`, url: `https://site${i}.com`, name: `Site ${i}` }));
    render([], [], [], shortcuts);
    expect(component['atShortcutLimit']()).toBeFalse();
  });

  it('orderedCards includes shortcuts', () => {
    render([], [], [], [makeShortcut()]);
    const cards = component['orderedCards']();
    expect(cards.some(c => c.type === 'SHORTCUT')).toBeTrue();
  });

  it('onConfirmDeleteShortcut removes shortcut from signal and calls API', () => {
    const shortcut = makeShortcut();
    shortcutApi.deleteShortcut.and.returnValue(of(undefined));
    render([], [], [], [shortcut]);
    component['confirmDeleteShortcut'] = shortcut;

    component['onConfirmDeleteShortcut']();

    expect(shortcutApi.deleteShortcut).toHaveBeenCalledWith(shortcut.id);
    expect(component['shortcuts']().length).toBe(0);
    expect(component['confirmDeleteShortcut']).toBeNull();
  });

  it('openAddShortcutDialog opens dialog and resets state', () => {
    render([]);
    component['shortcutUrlDraft'] = 'https://old.com';
    component['shortcutNameDraft'] = 'Old name';

    component['openAddShortcutDialog']();

    expect(component['shortcutDialogOpen']).toBeTrue();
    expect(component['shortcutUrlDraft']).toBe('');
    expect(component['shortcutNameDraft']).toBe('');
    expect(component['editingShortcut']).toBeNull();
  });

  it('closeShortcutDialog hides dialog', () => {
    render([]);
    component['shortcutDialogOpen'] = true;

    component['closeShortcutDialog']();

    expect(component['shortcutDialogOpen']).toBeFalse();
  });

  it('onShortcutEditRequested pre-fills dialog', () => {
    const shortcut = makeShortcut({ name: 'Test', emoji: '🎓' });
    render([], [], [], [shortcut]);

    component['onShortcutEditRequested'](shortcut);

    expect(component['shortcutDialogOpen']).toBeTrue();
    expect(component['editingShortcut']).toBe(shortcut);
    expect(component['shortcutUrlDraft']).toBe(shortcut.url);
    expect(component['shortcutIconType']).toBe('emoji');
  });

  // ── Stickers ──────────────────────────────────────────────────────────────

  it('submitStickerDialog creates a sticker via API with emoji', () => {
    const newSticker = makeSticker({ id: 'new-sticker', emoji: '🎉' });
    stickerApi.createSticker.and.returnValue(of(newSticker));
    lockerLayoutApi.saveLayout.and.returnValue(of([]));
    render();

    component['stickerDialogTab'] = 'emoji';
    component['stickerDialogEmoji'] = '🎉';
    component['stickerDialogLabel'] = '';
    component['submitStickerDialog']();

    expect(stickerApi.createSticker).toHaveBeenCalledWith(jasmine.objectContaining({ emoji: '🎉' }));
    expect(component['stickers']().some(s => s.id === 'new-sticker')).toBeTrue();
  });

  it('atStickerLimit is true at 50 stickers', () => {
    const stickers = Array.from({ length: 50 }, (_, i) => makeSticker({ id: `s${i}` }));
    stickerApi.getStickers.and.returnValue(of(stickers));
    render();
    expect(component['atStickerLimit']()).toBeTrue();
  });

  it('openStickerDialog does nothing when at sticker limit', () => {
    const stickers = Array.from({ length: 50 }, (_, i) => makeSticker({ id: `s${i}` }));
    stickerApi.getStickers.and.returnValue(of(stickers));
    render();

    component['openStickerDialog']();

    expect(component['stickerDialogOpen']).toBeFalse();
  });

  it('onStickerDeleted removes sticker from signal and calls API', () => {
    stickerApi.deleteSticker.and.returnValue(of(undefined));
    lockerLayoutApi.saveLayout.and.returnValue(of([]));
    stickerApi.getStickers.and.returnValue(of([makeSticker()]));
    render();

    component['onStickerDeleted']('sticker-1');

    expect(component['stickers']().length).toBe(0);
    expect(stickerApi.deleteSticker).toHaveBeenCalledWith('sticker-1');
  });

  it('submitStickerDialog updates a sticker via API when editing', () => {
    const updated = makeSticker({ emoji: '🎉', label: 'updated' });
    stickerApi.updateSticker.and.returnValue(of(updated));
    stickerApi.getStickers.and.returnValue(of([makeSticker()]));
    render();

    component['stickerEditId'] = 'sticker-1';
    component['stickerDialogTab'] = 'emoji';
    component['stickerDialogEmoji'] = '🎉';
    component['stickerDialogLabel'] = 'updated';
    component['submitStickerDialog']();

    expect(stickerApi.updateSticker).toHaveBeenCalledWith('sticker-1', jasmine.objectContaining({ emoji: '🎉' }));
  });

  // ── Font size ─────────────────────────────────────────────────────────────

  it('lockerFontSize defaults to medium when no localStorage value', () => {
    render();
    expect(component['lockerFontSize']().id).toBe('medium');
  });

  it('setLockerFontSize small sets CSS variable to 0.8rem', () => {
    render();
    const small = LOCKER_FONT_SIZES.find(s => s.id === 'small')!;

    component['setLockerFontSize'](small);
    fixture.detectChanges();

    const dashboard = fixture.nativeElement.querySelector('.dashboard');
    expect(dashboard?.style.getPropertyValue('--locker-body-font-size')).toBe('0.8rem');
  });

  it('setLockerFontSize large sets CSS variable to 1rem', () => {
    render();
    const large = LOCKER_FONT_SIZES.find(s => s.id === 'large')!;

    component['setLockerFontSize'](large);
    fixture.detectChanges();

    const dashboard = fixture.nativeElement.querySelector('.dashboard');
    expect(dashboard?.style.getPropertyValue('--locker-body-font-size')).toBe('1rem');
  });

  it('setLockerFontSize persists selection to localStorage', () => {
    render();
    const large = LOCKER_FONT_SIZES.find(s => s.id === 'large')!;

    component['setLockerFontSize'](large);

    expect(localStorage.getItem(MOCK_FONT_SIZE_KEY)).toBe('large');
  });

  it('page reload restores saved font size from localStorage', () => {
    localStorage.setItem(MOCK_FONT_SIZE_KEY, 'small');
    render();

    expect(component['lockerFontSize']().id).toBe('small');
    expect(component['lockerFontSize']().value).toBe('0.8rem');
  });
});
