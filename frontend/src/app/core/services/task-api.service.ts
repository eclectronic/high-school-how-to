import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EarnedBadge, TaskItem, TaskList } from '../models/task.models';

export interface UpdateTaskResponse extends TaskItem {
  earnedBadge?: EarnedBadge | null;
}

interface CreateListRequest {
  title: string;
  color?: string;
  textColor?: string | null;
}

interface CreateTaskRequest {
  description: string;
  dueAt?: string | null;
}

interface UpdateTaskRequest {
  description?: string;
  completed?: boolean;
  dueAt?: string | null;
  clearDueAt?: boolean;
}

interface UpdateListColorRequest {
  color: string;
  textColor?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class TaskApiService {
  private readonly http = inject(HttpClient);

  getTaskLists(): Observable<TaskList[]> {
    return this.http.get<TaskList[]>('/api/tasklists');
  }

  createList(title: string, color?: string, textColor?: string | null): Observable<TaskList> {
    const payload: CreateListRequest = { title };
    if (color) payload.color = color;
    if (textColor !== undefined) payload.textColor = textColor;
    return this.http.post<TaskList>('/api/tasklists', payload);
  }

  reorderLists(listIds: string[]): Observable<void> {
    return this.http.put<void>('/api/tasklists/reorder', { listIds });
  }

  updateListTitle(listId: string, title: string): Observable<TaskList> {
    return this.http.put<TaskList>(`/api/tasklists/${listId}/title`, { title });
  }

  updateListColor(listId: string, color: string, textColor?: string | null): Observable<TaskList> {
    const payload: UpdateListColorRequest = { color };
    if (textColor !== undefined) payload.textColor = textColor;
    return this.http.put<TaskList>(`/api/tasklists/${listId}/color`, payload);
  }

  deleteList(listId: string): Observable<void> {
    return this.http.delete<void>(`/api/tasklists/${listId}`);
  }

  addTask(listId: string, description: string, dueAt?: string | null): Observable<TaskItem> {
    const payload: CreateTaskRequest = { description };
    if (dueAt !== undefined) payload.dueAt = dueAt;
    return this.http.post<TaskItem>(`/api/tasklists/${listId}/tasks`, payload);
  }

  updateTask(listId: string, taskId: string, update: UpdateTaskRequest): Observable<UpdateTaskResponse> {
    return this.http.put<UpdateTaskResponse>(`/api/tasklists/${listId}/tasks/${taskId}`, update);
  }

  updateTaskDueDate(listId: string, taskId: string, dueAt: string | null): Observable<TaskItem> {
    const payload: UpdateTaskRequest = dueAt === null
      ? { clearDueAt: true }
      : { dueAt, clearDueAt: false };
    return this.http.put<TaskItem>(`/api/tasklists/${listId}/tasks/${taskId}`, payload);
  }

  reorderTasks(listId: string, taskIds: string[]): Observable<TaskItem[]> {
    return this.http.put<TaskItem[]>(`/api/tasklists/${listId}/tasks/reorder`, { taskIds });
  }

  deleteTask(listId: string, taskId: string): Observable<void> {
    return this.http.delete<void>(`/api/tasklists/${listId}/tasks/${taskId}`);
  }
}
