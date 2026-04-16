import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { NotesAppComponent } from './notes-app.component';
import { NoteApiService } from '../../../core/services/note-api.service';
import { Note } from '../../../core/models/task.models';

function note(partial: Partial<Note> & { id: string; title: string }): Note {
  return {
    color: '#fffef8',
    ...partial,
  };
}

describe('NotesAppComponent', () => {
  let fixture: ComponentFixture<NotesAppComponent>;
  let component: NotesAppComponent;
  let noteApiSpy: jasmine.SpyObj<NoteApiService>;

  const seed: Note[] = [
    note({ id: 'a', title: 'Apple',    sortOrder: 2, createdAt: '2026-04-10T00:00:00Z' }),
    note({ id: 'b', title: 'banana',   sortOrder: 0, createdAt: '2026-04-14T00:00:00Z' }),
    note({ id: 'c', title: 'Cherry',   sortOrder: 1, createdAt: '2026-04-12T00:00:00Z' }),
  ];

  beforeEach(async () => {
    localStorage.removeItem('notes.sortMode');

    noteApiSpy = jasmine.createSpyObj('NoteApiService', [
      'getNotes',
      'createNote',
      'updateNote',
      'deleteNote',
      'reorderNotes',
    ]);
    noteApiSpy.getNotes.and.returnValue(of(seed.slice()));
    noteApiSpy.reorderNotes.and.returnValue(of(undefined as unknown as void));

    await TestBed.configureTestingModule({
      imports: [NotesAppComponent],
      providers: [
        { provide: NoteApiService, useValue: noteApiSpy },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(NotesAppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function currentOrder(): string[] {
    return (component as any).sortedNotes().map((n: Note) => n.id);
  }

  it('defaults to custom sort (sortOrder ascending) when no preference is stored', () => {
    expect((component as any).sortMode()).toBe('custom');
    // sortOrder: b=0, c=1, a=2
    expect(currentOrder()).toEqual(['b', 'c', 'a']);
  });

  it('sorts by name (case-insensitive) when mode is name', () => {
    (component as any).setSortMode('name');
    // Apple, banana, Cherry
    expect(currentOrder()).toEqual(['a', 'b', 'c']);
  });

  it('sorts by date newest-first when mode is date', () => {
    (component as any).setSortMode('date');
    // createdAt: b=14th, c=12th, a=10th
    expect(currentOrder()).toEqual(['b', 'c', 'a']);
  });

  it('persists sort mode in localStorage', () => {
    (component as any).setSortMode('name');
    expect(localStorage.getItem('notes.sortMode')).toBe('name');
  });

  it('restores the stored sort mode on init', async () => {
    localStorage.setItem('notes.sortMode', 'name');

    const fresh = TestBed.createComponent(NotesAppComponent);
    fresh.detectChanges();

    expect((fresh.componentInstance as any).sortMode()).toBe('name');
  });

  it('onDrop calls reorderNotes with the new id order in custom mode', () => {
    (component as any).setSortMode('custom');
    // Start order: b, c, a (by sortOrder 0,1,2). Move index 0 -> 2 => c, a, b.
    (component as any).onDrop({ previousIndex: 0, currentIndex: 2 });

    expect(noteApiSpy.reorderNotes).toHaveBeenCalledWith(['c', 'a', 'b']);
  });

  it('onDrop is a no-op outside custom mode', () => {
    (component as any).setSortMode('name');
    (component as any).onDrop({ previousIndex: 0, currentIndex: 2 });
    expect(noteApiSpy.reorderNotes).not.toHaveBeenCalled();
  });
});
