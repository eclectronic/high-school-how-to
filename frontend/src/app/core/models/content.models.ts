export type CardType = 'VIDEO' | 'INFOGRAPHIC' | 'ARTICLE';
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
}

export interface SectionResponse {
  tag: Tag;
  heading: string;
  cards: ContentCard[];
}

export interface HomeLayoutResponse {
  sections: SectionResponse[];
}

export interface ImageUploadResponse {
  url: string;
  thumbnailUrl: string | null;
}
