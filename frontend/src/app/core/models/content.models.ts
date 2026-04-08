export type CardType = 'VIDEO' | 'INFOGRAPHIC' | 'ARTICLE' | 'TODO_LIST';
export type CardStatus = 'DRAFT' | 'PUBLISHED';

export interface Tag {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
}

export interface ContentCard {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  cardType: CardType;
  mediaUrl: string | null;
  printMediaUrl: string | null;
  thumbnailUrl: string | null;
  coverImageUrl: string | null;
  bodyHtml: string | null;
  backgroundColor: string | null;
  textColor: string | null;
  simpleLayout: boolean;
  status: CardStatus;
  tags: Tag[];
  templateTasks: ContentCardTask[];
  createdAt: string;
  updatedAt: string;
}

export interface ContentCardAdmin extends ContentCard {
  bodyJson: string | null;
}

export interface SaveTagRequest {
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
}

export interface SaveCardRequest {
  title: string;
  slug: string;
  description: string | null;
  cardType: CardType;
  mediaUrl: string | null;
  printMediaUrl: string | null;
  thumbnailUrl: string | null;
  coverImageUrl: string | null;
  bodyJson: string | null;
  bodyHtml: string | null;
  backgroundColor: string | null;
  textColor: string | null;
  simpleLayout: boolean;
  status: CardStatus;
  tagIds: number[];
  templateTasks: Array<{ description: string }> | null;
}

export interface SectionResponse {
  tag: Tag;
  heading: string;
  cards: ContentCard[];
}

export interface HomeLayoutResponse {
  sections: SectionResponse[];
}

export interface ContentCardTask {
  id: number;
  description: string;
  sortOrder: number;
}

export interface LockerStatusResponse {
  added: boolean;
  taskListId: string | null;
}

export interface ImageUploadResponse {
  url: string;
  thumbnailUrl: string | null;
}
