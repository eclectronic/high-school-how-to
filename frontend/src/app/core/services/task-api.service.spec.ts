import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TaskApiService } from './task-api.service';
import { TaskList, TaskItem } from '../models/task.models';

describe('TaskApiService', () => {
  let service: TaskApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TaskApiService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(TaskApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('createList sends title and color', () => {
    service.createList('To-dos', '#fef3c7').subscribe();
    const req = http.expectOne('/api/tasklists');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ title: 'To-dos', color: '#fef3c7' });
    req.flush({} as TaskList);
  });

  it('createList sends textColor when provided', () => {
    service.createList('To-dos', '#fef3c7', '#000000').subscribe();
    const req = http.expectOne('/api/tasklists');
    expect(req.request.body).toEqual({ title: 'To-dos', color: '#fef3c7', textColor: '#000000' });
    req.flush({} as TaskList);
  });

  it('updateListColor sends color and textColor', () => {
    service.updateListColor('list-1', 'linear-gradient(#a, #b)', '#ffffff').subscribe();
    const req = http.expectOne('/api/tasklists/list-1/color');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ color: 'linear-gradient(#a, #b)', textColor: '#ffffff' });
    req.flush({} as TaskList);
  });

  it('addTask sends description and dueAt', () => {
    service.addTask('list-1', 'Study', '2026-04-10T15:00:00Z').subscribe();
    const req = http.expectOne('/api/tasklists/list-1/tasks');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ description: 'Study', dueAt: '2026-04-10T15:00:00Z' });
    req.flush({} as TaskItem);
  });

  it('updateTaskDueDate sends clearDueAt=true when null', () => {
    service.updateTaskDueDate('list-1', 'task-1', null).subscribe();
    const req = http.expectOne('/api/tasklists/list-1/tasks/task-1');
    expect(req.request.body).toEqual({ clearDueAt: true });
    req.flush({} as TaskItem);
  });

  it('updateTaskDueDate sends dueAt when date provided', () => {
    service.updateTaskDueDate('list-1', 'task-1', '2026-04-10T15:00:00Z').subscribe();
    const req = http.expectOne('/api/tasklists/list-1/tasks/task-1');
    expect(req.request.body).toEqual({ dueAt: '2026-04-10T15:00:00Z', clearDueAt: false });
    req.flush({} as TaskItem);
  });
});
