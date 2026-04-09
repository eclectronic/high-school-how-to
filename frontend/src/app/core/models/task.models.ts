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
  sourceContentCardId?: number | null;
}

export interface LockerLayoutItem {
  cardType: string; // 'TASK_LIST' | 'TIMER' | 'NOTE' | 'SHORTCUT'
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

export type NoteType = 'REGULAR' | 'QUOTE';

export interface Note {
  id: string;
  title: string;
  content?: string | null;
  color: string;
  textColor?: string | null;
  fontSize?: string | null; // 'small' | 'medium' | 'large'
  noteType?: NoteType;
}

export interface Quote {
  id: number;
  quoteText: string;
  attribution?: string | null;
}

export interface Shortcut {
  id: string;
  url: string;
  name: string;
  faviconUrl?: string | null;
  emoji?: string | null;
  iconUrl?: string | null;
}

export interface Sticker {
  id: string;
  type: string; // 'EMOJI' | 'IMAGE'
  emoji: string | null;
  imageUrl: string | null;
  positionX: number;
  positionY: number;
  size: string; // 'small' | 'medium' | 'large'
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

