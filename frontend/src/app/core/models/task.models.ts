export interface TaskItem {
  id: string;
  description: string;
  completed: boolean;
}

export interface TaskList {
  id: string;
  title: string;
  color: string;
  tasks: TaskItem[];
}
