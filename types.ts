// types.ts — Database schema interfaces (aligned with the live Supabase schema)

export interface Magazine {
  id: number;
  name: string;
  slug: string | null;
  short_name: string | null;
  description: string | null;
  cover_image_url: string | null;
  logo_image_url: string | null;
  website_url: string | null;
  headquarters: string | null;
  founded_year: number | null;
  issn_print: string | null;
  issn_online: string | null;
  is_active: boolean | null;
}

export interface MagazineWithStats extends Magazine {
  recordCount: number;
  yearStart: number | null;
  yearEnd: number | null;
}

export interface Author {
  id: number;
  name: string;
  created_at: string;
  description: string | null;
  cover_url: string | null;
  national: string | null;
  designation: string | null;
  short_name: string | null;
}

export interface Tag {
  id: number;
  name: string;
  created_at?: string;
  important: boolean | null;
}

// A single article/record. Note the real column names below — the DB uses
// `name_legacy` / `language_legacy`; the canonical magazine name/slug come from
// the joined `magazines` relation via `magazine_id`.
export interface Record {
  id: number;
  magazine_id: number | null;
  timestamp: string | null;
  summary: string | null;
  pdf_url: string | null;
  volume: string | null;
  number: string | null;
  title_name: string | null;
  name: string | null;
  page_numbers: string | null;
  authors: string | null;
  language: string | null;
  email: string | null;
  creator_name: string | null;
  conclusion: string | null;
  pdf_public_id: string | null;
  extracted_text?: string | null;
  name_legacy: string | null;
  language_legacy: string | null;
}

export interface Summary {
  id: number;
  created_at: string;
  summary: string | null;
  record_id: number;
  email: string | null;
  name: string | null;
}

export interface Conclusion {
  id: number;
  created_at: string;
  conclusion: string | null;
  record_id: number;
  email: string | null;
  name: string | null;
}

export interface RecordWithDetails extends Record {
  magazines?: Magazine | null;
  record_authors: {
    author_id: number;
    authors: Author;
  }[];
  record_tags: {
    tag_id: number;
    tags: Tag;
  }[];
  summaries: Summary[];
  conclusions: Conclusion[];
  // populated by the keyword-search ranker, when present
  relevance?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SearchFilters {
  searchQuery?: string;
  tags?: number[];
  authors?: number[];
  magazine?: string;
  magazineId?: number;
  language?: string;
  yearRange?: {
    start?: number;
    end?: number;
  };
}

export type SortOption =
  | 'relevance'
  | 'random'
  | 'title_asc'
  | 'title_desc'
  | 'newest'
  | 'oldest';

export interface SmartSearchResult {
  id: number;
  title_name: string;
  authors: string;
  summary: string;
  pdf_url: string;
  finalScore: number;
  breakdown: {
    cosineSimilarity: number;
    bm25Rank: number;
    properNounBoost: number;
    fieldMatchBonus: number;
    engagementScore: number;
  };
}

export interface SmartSearchResponse {
  results: SmartSearchResult[];
}
