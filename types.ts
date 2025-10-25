// types.ts - Database schema interfaces

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
    created_at: string;
    important: boolean | null;
  }
  
  export interface Record {
    id: number;
    name: string;
    timestamp: string | null;
    summary: string | null;
    pdf_url: string;
    volume: string | null;
    number: string | null;
    title_name: string | null;
    page_numbers: string | null;
    authors: string | null;
    language: string | null;
    email: string | null;
    creator_name: string | null;
    conclusion: string | null;
    pdf_public_id: string | null;
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
    language?: string;
    yearRange?: {
      start?: number;
      end?: number;
    };
  }

export type SortOption = 'title_asc' | 'title_desc' | 'newest' | 'oldest';
