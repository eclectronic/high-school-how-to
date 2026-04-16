import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NEVER, of } from 'rxjs';
import { TodoAppComponent } from './todo-app.component';
import { TaskApiService } from '../../../core/services/task-api.service';
import { TaskList, TaskItem } from '../../../core/models/task.models';

function task(id: string, description: string, extra: Partial<TaskItem> = {}): TaskItem {
  return { id, description, completed: false, ...extra };
}

describe('TodoAppComponent — task reordering', () => {
  let fixture: ComponentFixture<TodoAppComponent>;
  let component: TodoAppComponent;
  let taskApiSpy: jasmine.SpyObj<TaskApiService>;

  const list: TaskList = {
    id: 'list-1',
    title: 'Chores',
    color: '#fffef8',
    textColor: null,
    tasks: [
      task('t1', 'Laundry'),
      task('t2', 'Dishes'),
      task('t3', 'Mail'),
    ],
  };

  beforeEach(async () => {
    taskApiSpy = jasmine.createSpyObj('TaskApiService', [
      'getTaskLists',
      'createList',
      'updateListTitle',
      'updateListColor',
      'deleteList',
      'addTask',
      'updateTask',
      'deleteTask',
      'reorderTasks',
    ]);
    taskApiSpy.getTaskLists.and.returnValue(of([list]));
    // reorderTasks returns the reordered tasks from the server — echo the request
    taskApiSpy.reorderTasks.and.callFake((_listId: string, taskIds: string[]) =>
      of(taskIds.map(id => list.tasks.find(t => t.id === id)!))
    );

    await TestBed.configureTestingModule({
      imports: [TodoAppComponent],
      providers: [
        { provide: TaskApiService, useValue: taskApiSpy },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(TodoAppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // Open the list so selectedList() is populated
    (component as any).openList(list);
  });

  it('onTaskDrop calls reorderTasks with the new id order', () => {
    (component as any).onTaskDrop({ previousIndex: 0, currentIndex: 2 });

    expect(taskApiSpy.reorderTasks).toHaveBeenCalledWith('list-1', ['t2', 't3', 't1']);
  });

  it('onTaskDrop optimistically updates selectedList before the server responds', () => {
    // Use NEVER so the subscribe callback does not overwrite the optimistic state
    taskApiSpy.reorderTasks.and.returnValue(NEVER);

    (component as any).onTaskDrop({ previousIndex: 2, currentIndex: 0 });

    const tasks = (component as any).selectedList()?.tasks.map((t: TaskItem) => t.id);
    expect(tasks).toEqual(['t3', 't1', 't2']);
  });

  it('onTaskDrop is a no-op when previousIndex === currentIndex', () => {
    (component as any).onTaskDrop({ previousIndex: 1, currentIndex: 1 });
    expect(taskApiSpy.reorderTasks).not.toHaveBeenCalled();
  });
});
