import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TaskItem, TaskList } from '../models/task.models';

interface CreateListRequest {
  title: string;
  color?: string;
}

interface CreateTaskRequest {
  description: string;
}

interface UpdateTaskRequest {
  description?: string;
  completed?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TaskApiService {
  private readonly http = inject(HttpClient);

  getTaskLists(): Observable<TaskList[]> {
    return this.http.get<TaskList[]>('/api/tasklists');
  }

  createList(title: string, color?: string): Observable<TaskList> {
    const payload: CreateListRequest = color ? { title, color } : { title };
    return this.http.post<TaskList>('/api/tasklists', payload);
  }

  updateListTitle(listId: string, title: string): Observable<TaskList> {
    return this.http.put<TaskList>(`/api/tasklists/${listId}/title`, { title });
  }

  updateListColor(listId: string, color: string): Observable<TaskList> {
    return this.http.put<TaskList>(`/api/tasklists/${listId}/color`, { color });
  }

  deleteList(listId: string): Observable<void> {
    return this.http.delete<void>(`/api/tasklists/${listId}`);
  }

  addTask(listId: string, description: string): Observable<TaskItem> {
    const payload: CreateTaskRequest = { description };
    return this.http.post<TaskItem>(`/api/tasklists/${listId}/tasks`, payload);
  }

  updateTask(listId: string, taskId: string, update: UpdateTaskRequest): Observable<TaskItem> {
    return this.http.put<TaskItem>(`/api/tasklists/${listId}/tasks/${taskId}`, update);
  }

  reorderTasks(listId: string, taskIds: string[]): Observable<TaskItem[]> {
    return this.http.put<TaskItem[]>(`/api/tasklists/${listId}/tasks/reorder`, { taskIds });
  }

  deleteTask(listId: string, taskId: string): Observable<void> {
    return this.http.delete<void>(`/api/tasklists/${listId}/tasks/${taskId}`);
  }
}
