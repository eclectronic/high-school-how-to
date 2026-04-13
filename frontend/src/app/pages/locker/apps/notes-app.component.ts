import { Component, Input, Output, EventEmitter, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NoteApiService } from '../../../core/services/note-api.service';
import { Note } from '../../../core/models/task.models';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { InlineTitleEditComponent } from '../../../shared/inline-title-edit/inline-title-edit.component';
import { SwatchPickerComponent } from '../../../shared/swatch-picker/swatch-picker.component';
import { autoContrastColor } from '../../../shared/color-picker/color-utils';

@Component({
  selector: 'app-notes-app',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ConfirmDialogComponent,
    InlineTitleEditComponent,
    SwatchPickerComponent,
  ],
  templateUrl: './notes-app.component.html',
  styleUrl: './notes-app.component.scss',
})
export class NotesAppComponent implements OnInit {
  @Input() paletteColor = '#1a8a6e';
  @Output() subtitleChange = new EventEmitter<string>();
  @Output() headerColorChange = new EventEmitter<string | null>();

  private readonly noteApi = inject(NoteApiService);

  protected notes = signal<Note[]>([]);
  protected view = signal<'list' | 'detail'>('list');
  protected selectedNote = signal<Note | null>(null);
  protected loading = signal(false);

  protected editTitle = '';
  protected editContent = '';
  protected deleteTarget = signal<Note | null>(null);
  protected showColorPickerForNote = signal<string | null>(null);
  protected colorPickerNote = computed(() => {
    const id = this.showColorPickerForNote();
    if (!id) return null;
    return this.notes().find(n => n.id === id) ?? this.selectedNote() ?? null;
  });
  protected saving = signal(false);

  ngOnInit(): void {
    this.loadNotes();
  }

  private loadNotes(): void {
    this.loading.set(true);
    this.noteApi.getNotes().subscribe({
      next: notes => {
        this.notes.set(notes);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected openNote(note: Note): void {
    this.selectedNote.set(note);
    this.editTitle = note.title;
    this.editContent = note.content ?? '';
    this.showColorPickerForNote.set(null);
    this.view.set('detail');
    this.subtitleChange.emit(note.title);
    this.headerColorChange.emit(note.color);
  }

  protected goBack(): void {
    this.saveCurrentNote();
    this.view.set('list');
    this.selectedNote.set(null);
    this.editTitle = '';
    this.editContent = '';
    this.showColorPickerForNote.set(null);
    this.subtitleChange.emit('List');
    this.headerColorChange.emit(null);
  }

  protected createNote(): void {
    this.noteApi.createNote({ title: 'New Note', color: '#fffef8' }).subscribe({
      next: result => {
        const note: Note = result;
        this.notes.update(ns => [note, ...ns]);
        this.openNote(note);
      },
    });
  }

  protected saveCurrentNote(): void {
    const note = this.selectedNote();
    if (!note) return;

    const title = this.editTitle.trim() || 'Untitled';
    const content = this.editContent;

    this.noteApi.updateNote(note.id, {
      title,
      content,
      color: note.color,
      textColor: note.textColor,
    }).subscribe({
      next: updated => {
        this.notes.update(ns => ns.map(n => n.id === updated.id ? updated : n));
        this.selectedNote.set(updated);
      },
    });
  }

  protected onTitleChange(newTitle: string): void {
    const note = this.selectedNote();
    if (!note) return;

    this.noteApi.updateNote(note.id, {
      title: newTitle,
      content: this.editContent,
      color: note.color,
      textColor: note.textColor,
    }).subscribe({
      next: updated => {
        this.notes.update(ns => ns.map(n => n.id === updated.id ? updated : n));
        this.selectedNote.set(updated);
        this.editTitle = updated.title;
        this.subtitleChange.emit(updated.title);
      },
    });
  }

  protected onContentBlur(): void {
    this.saveCurrentNote();
  }

  protected toggleColorPicker(noteId: string): void {
    this.showColorPickerForNote.update(id => id === noteId ? null : noteId);
  }

  protected onColorChange(color: string): void {
    const note = this.selectedNote();
    if (!note) return;

    const textColor = autoContrastColor(color.startsWith('#') ? color : '#fffef8');
    this.noteApi.updateNote(note.id, {
      title: this.editTitle.trim() || note.title,
      content: this.editContent,
      color,
      textColor,
    }).subscribe({
      next: updated => {
        this.notes.update(ns => ns.map(n => n.id === updated.id ? updated : n));
        this.selectedNote.set(updated);
        this.showColorPickerForNote.set(null);
        this.headerColorChange.emit(updated.color);
      },
    });
  }

  protected confirmDeleteNote(note: Note): void {
    this.deleteTarget.set(note);
  }

  protected onDeleteConfirmed(): void {
    const target = this.deleteTarget();
    if (!target) return;
    this.noteApi.deleteNote(target.id).subscribe({
      next: () => {
        this.notes.update(ns => ns.filter(n => n.id !== target.id));
        this.deleteTarget.set(null);
        if (this.selectedNote()?.id === target.id) {
          this.view.set('list');
          this.selectedNote.set(null);
        }
      },
    });
  }

  protected onDeleteCancelled(): void {
    this.deleteTarget.set(null);
  }

  protected getContentPreview(note: Note): string {
    const c = note.content ?? '';
    return c.length > 80 ? c.slice(0, 80) + '…' : c;
  }
}
