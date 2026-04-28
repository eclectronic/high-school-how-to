export type CardType = 'VIDEO' | 'INFOGRAPHIC' | 'ARTICLE' | 'TODO_LIST';

export interface MediaUrlEntry {
  url: string;
  printUrl: string | null;
  alt: string | null;
}
export type CardStatus = 'DRAFT' | 'PUBLISHED';

export interface ContentCardLinkResponse {
  id: number;
  targetCardId: number;
  targetSlug: string;
  targetTitle: string;
  targetCardType: CardType;
  linkText: string;
  sortOrder: number;
}

export interface ContentCardLinkRequest {
  targetCardId: number;
  linkText: string | null;
  sortOrder: number;
}

export interface ContentCardSummary {
  id: number;
  title: string;
  slug: string;
  cardType: CardType;
  status: CardStatus;
}

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
  mediaUrls: MediaUrlEntry[];
  thumbnailUrl: string | null;
  coverImageUrl: string | null;
  bodyHtml: string | null;
  backgroundColor: string | null;
  textColor: string | null;
  simpleLayout: boolean;
  status: CardStatus;
  tags: Tag[];
  links: ContentCardLinkResponse[];
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
  mediaUrls: MediaUrlEntry[] | null;
  thumbnailUrl: string | null;
  coverImageUrl: string | null;
  bodyJson: string | null;
  bodyHtml: string | null;
  backgroundColor: string | null;
  textColor: string | null;
  simpleLayout: boolean;
  status: CardStatus;
  tagIds: number[];
  links: ContentCardLinkRequest[];
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

export function cardTypeIcon(cardType: CardType): string {
  switch (cardType) {
    case 'ARTICLE':
      return '📄';
    case 'VIDEO':
      return '🎬';
    case 'INFOGRAPHIC':
      return '🖼';
    case 'TODO_LIST':
      return '☑';
    default:
      return '📄';
  }
}
