export interface HomeSection {
  id: number;
  sortOrder: number;
  layout: 'full' | 'split';
  slot1Tag: string;
  slot2Tag: string | null;
}

export interface HomeSectionRequest {
  layout: 'full' | 'split';
  slot1Tag: string;
  slot2Tag: string | null;
}
