export interface TaskItem {
  id: string;
  description: string;
  completed: boolean;
  dueAt?: string | null; // ISO 8601 date string
}

export interface TaskList {
  id: string;
  title: string;
  color: string;
  textColor?: string | null;
  tasks: TaskItem[];
}

export interface LockerLayoutItem {
  cardType: string; // 'TASK_LIST' | 'TIMER' | 'NOTE' | 'BOOKMARK_LIST'
  cardId: string;
  sortOrder: number;
}

export interface Timer {
  id: string;
  title: string;
  color: string;
  textColor?: string | null;
  focusDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsBeforeLongBreak: number;
  presetName?: string | null;
  linkedTaskListId?: string | null;
}

export interface Note {
  id: string;
  title: string;
  content?: string | null;
  color: string;
  textColor?: string | null;
  fontSize?: string | null; // 'small' | 'medium' | 'large'
}

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  faviconUrl?: string | null;
  sortOrder: number;
}

export interface BookmarkList {
  id: string;
  title: string;
  color: string;
  textColor?: string | null;
  bookmarks: Bookmark[];
}

export interface Sticker {
  id: string;
  emoji: string | null;
  iconUrl: string | null;
  label: string | null;
  createdAt: string;
  updatedAt: string;
}
