import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA, SimpleChange } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { TodoListEditComponent } from './todo-list-edit.component';
import { ContentCardTask } from '../../core/models/content.models';

function makeTasks(descriptions: string[]): ContentCardTask[] {
  return descriptions.map((description, i) => ({ id: i + 1, description, sortOrder: i }));
}

describe('TodoListEditComponent', () => {
  let fixture: ComponentFixture<TodoListEditComponent>;
  let component: TodoListEditComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TodoListEditComponent, FormsModule, DragDropModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(TodoListEditComponent);
    component = fixture.componentInstance;
  });

  const setTasks = (descriptions: string[]) => {
    component.tasks = makeTasks(descriptions);
    component.ngOnChanges({ tasks: new SimpleChange(null, component.tasks, true) });
    fixture.detectChanges();
  };

  // ── Renders tasks from input ───────────────────────────────────────────────

  it('renders task descriptions from input', () => {
    setTasks(['Task A', 'Task B']);
    const tasks: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.todo-edit__task'));
    expect(tasks.length).toBe(2);
  });

  it('shows empty message when no tasks', () => {
    setTasks([]);
    const emptyMsg: HTMLElement = fixture.nativeElement.querySelector('.todo-edit__empty');
    expect(emptyMsg).not.toBeNull();
  });

  it('shows task count', () => {
    setTasks(['A', 'B', 'C']);
    const countEl: HTMLElement = fixture.nativeElement.querySelector('.todo-edit__count');
    expect(countEl.textContent).toContain('3/50');
  });

  // ── Adding tasks ─────────────────────────────────────────────────────────

  it('addTask() emits tasksChange with new task appended', () => {
    setTasks(['Existing']);
    const emitted: { description: string }[][] = [];
    component.tasksChange.subscribe(v => emitted.push(v));

    component['newTaskDesc'] = 'New Task';
    component['addTask']();

    expect(emitted.length).toBe(1);
    expect(emitted[0].length).toBe(2);
    expect(emitted[0][1].description).toBe('New Task');
  });

  it('addTask() does not emit when description is empty', () => {
    setTasks([]);
    const emitted: any[] = [];
    component.tasksChange.subscribe(v => emitted.push(v));

    component['newTaskDesc'] = '   ';
    component['addTask']();

    expect(emitted.length).toBe(0);
  });

  it('addTask() disables add when 50 tasks reached', () => {
    setTasks(Array.from({ length: 50 }, (_, i) => `Task ${i}`));
    const emitted: any[] = [];
    component.tasksChange.subscribe(v => emitted.push(v));

    component['newTaskDesc'] = 'One more';
    component['addTask']();

    expect(emitted.length).toBe(0);
    expect(component['editTasks']().length).toBe(50);
  });

  // ── Deleting tasks ────────────────────────────────────────────────────────

  it('confirmDeleteTask() sets deleteTarget', () => {
    setTasks(['Alpha', 'Beta']);
    const taskToDelete = component['editTasks']()[0];
    component['confirmDeleteTask'](taskToDelete);
    expect(component['deleteTarget']()).toEqual(taskToDelete);
  });

  it('onDeleteConfirmed() removes task and emits tasksChange', () => {
    setTasks(['Alpha', 'Beta']);
    const taskToDelete = component['editTasks']()[0];
    const emitted: { description: string }[][] = [];
    component.tasksChange.subscribe(v => emitted.push(v));

    component['confirmDeleteTask'](taskToDelete);
    component['onDeleteConfirmed']();

    expect(emitted.length).toBe(1);
    expect(emitted[0].length).toBe(1);
    expect(emitted[0][0].description).toBe('Beta');
    expect(component['deleteTarget']()).toBeNull();
  });

  it('onDeleteCancelled() clears deleteTarget without removing task', () => {
    setTasks(['Alpha', 'Beta']);
    const taskToDelete = component['editTasks']()[0];
    component['confirmDeleteTask'](taskToDelete);
    component['onDeleteCancelled']();

    expect(component['editTasks']().length).toBe(2);
    expect(component['deleteTarget']()).toBeNull();
  });

  // ── Reorder via drag-drop ─────────────────────────────────────────────────

  it('onTaskDrop() emits tasksChange with reordered array', () => {
    setTasks(['First', 'Second', 'Third']);
    const emitted: { description: string }[][] = [];
    component.tasksChange.subscribe(v => emitted.push(v));

    const dropEvent = { previousIndex: 0, currentIndex: 2 } as CdkDragDrop<any>;
    component['onTaskDrop'](dropEvent);

    expect(emitted.length).toBe(1);
    expect(emitted[0].map(t => t.description)).toEqual(['Second', 'Third', 'First']);
  });

  it('onTaskDrop() does not emit if same index', () => {
    setTasks(['First', 'Second']);
    const emitted: any[] = [];
    component.tasksChange.subscribe(v => emitted.push(v));

    const dropEvent = { previousIndex: 1, currentIndex: 1 } as CdkDragDrop<any>;
    component['onTaskDrop'](dropEvent);

    expect(emitted.length).toBe(0);
  });

  // ── Color picker ──────────────────────────────────────────────────────────

  it('onColorChange() emits backgroundColorChange', () => {
    setTasks([]);
    const emitted: string[] = [];
    component.backgroundColorChange.subscribe(v => emitted.push(v));

    component['onColorChange']('#ff0000');

    expect(emitted.length).toBe(1);
    expect(emitted[0]).toBe('#ff0000');
  });

  it('onColorChange() closes the color picker', () => {
    setTasks([]);
    component['showColorPicker'].set(true);
    component['onColorChange']('#aabbcc');
    expect(component['showColorPicker']()).toBeFalse();
  });

  it('does not emit backgroundColorChange when backgroundColor input changes', () => {
    const bgEmitted: string[] = [];
    component.backgroundColorChange.subscribe(v => bgEmitted.push(v));

    component.backgroundColor = '#ff0000';
    component.ngOnChanges({ backgroundColor: new SimpleChange(null, '#ff0000', false) });

    expect(bgEmitted.length).toBe(0);
  });
});
