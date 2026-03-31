import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { TaskApiService } from '../../../core/services/task-api.service';
import { TaskList } from '../../../core/models/task.models';
import { RouterTestingModule } from '@angular/router/testing';

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let component: DashboardComponent;
  let taskApi: jasmine.SpyObj<TaskApiService>;

  beforeEach(async () => {
    taskApi = jasmine.createSpyObj<TaskApiService>('TaskApiService', [
      'getTaskLists',
      'createList',
      'deleteList',
      'addTask',
      'updateTask',
      'deleteTask'
    ]);

    await TestBed.configureTestingModule({
      imports: [DashboardComponent, RouterTestingModule],
      providers: [{ provide: TaskApiService, useValue: taskApi }]
    }).compileComponents();
  });

  const render = () => {
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  it('creates the starter "Did I..." list when none exist', () => {
    taskApi.getTaskLists.and.returnValue(of([]));
    taskApi.createList.and.returnValue(
      of({ id: 'new-id', title: 'Did I...', tasks: [] } as TaskList)
    );

    render();

    expect(taskApi.createList).toHaveBeenCalledWith('Did I...');
    expect((component as any).taskLists().length).toBe(1);
    expect((component as any).taskLists()[0].title).toBe('Did I...');
  });

  it('shows an error when creating a list fails', () => {
    taskApi.getTaskLists.and.returnValue(of([]));
    taskApi.createList.and.returnValue(throwError(() => new Error('boom')));

    render();

    component['newListTitle'] = 'Oops';
    component['createList']();
    fixture.detectChanges();

    expect(component['errorMessage']).toContain('Unable to add a list');
  });

  it('adds a list when submitted via the form', () => {
    taskApi.getTaskLists.and.returnValue(
      of([{ id: 'existing', title: 'Existing', tasks: [] } as TaskList])
    );
    taskApi.createList.and.returnValue(
      of({ id: 'created', title: 'My List', tasks: [] } as TaskList)
    );

    render();

    component['newListTitle'] = 'My List';
    component['createList']();

    expect(taskApi.createList).toHaveBeenCalledWith('My List');
    const lists = (component as any).taskLists();
    expect(lists.find((l: TaskList) => l.id === 'created')).toBeTruthy();
  });
});
