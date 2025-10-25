import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  Author,
  PaginatedResponse,
  RecordWithDetails,
  SearchFilters,
  SortOption,
  Tag,
} from '@/types';
import { readCache, writeCache } from './cache';

interface RecordsRequest {
  page?: number;
  pageSize?: number;
  filters?: SearchFilters;
  sort?: SortOption;
}

const RECORDS_CACHE_TTL = 1000 * 60 * 5; // 5 minutes
const LOOKUP_CACHE_TTL = 1000 * 60 * 30; // 30 minutes

let cachedClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (cachedClient) {
    return cachedClient;
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Supabase credentials are not configured.');
  }

  cachedClient = createClient(url, key, {
    auth: {
      persistSession: false,
    },
  });

  return cachedClient;
}

function buildCacheKey({ page, pageSize, filters, sort }: RecordsRequest): string {
  return JSON.stringify({
    page: page ?? 1,
    pageSize: pageSize ?? 20,
    sort: sort ?? 'title_asc',
    filters: filters ?? {},
  });
}

function applySorting(query: any, sort?: SortOption) {
  const option = sort ?? 'title_asc';

  switch (option) {
    case 'title_desc':
      return query.order('title_name', { ascending: false, nullsFirst: false });
    case 'newest':
      return query.order('timestamp', { ascending: false, nullsFirst: false });
    case 'oldest':
      return query.order('timestamp', { ascending: true, nullsLast: false });
    case 'title_asc':
    default:
      return query.order('title_name', { ascending: true, nullsFirst: false });
  }
}

function normaliseFilters(filters: SearchFilters | undefined): SearchFilters {
  if (!filters) {
    return {};
  }

  const normalised: SearchFilters = { ...filters };

  if (normalised.tags?.length === 0) {
    normalised.tags = undefined;
  }
  if (normalised.authors?.length === 0) {
    normalised.authors = undefined;
  }
  if (normalised.searchQuery && normalised.searchQuery.trim().length === 0) {
    normalised.searchQuery = undefined;
  }
  if (normalised.magazine && normalised.magazine.trim().length === 0) {
    normalised.magazine = undefined;
  }
  if (normalised.language && normalised.language.trim().length === 0) {
    normalised.language = undefined;
  }

  return normalised;
}

export async function fetchRecordsWithFilters({
  page = 1,
  pageSize = 20,
  filters,
  sort,
}: RecordsRequest): Promise<PaginatedResponse<RecordWithDetails>> {
  const normalizedFilters = normaliseFilters(filters);
  const cacheKey = buildCacheKey({ page, pageSize, filters: normalizedFilters, sort });

  const cached = await readCache<PaginatedResponse<RecordWithDetails>>(cacheKey, RECORDS_CACHE_TTL);
  if (cached) {
    return cached;
  }

  const supabase = getSupabaseClient();

  let query: any = supabase
    .from('records')
    .select(
      `
        *,
        record_authors (
          author_id,
          authors (*)
        ),
        record_tags (
          tag_id,
          tags (*)
        ),
        summaries (*),
        conclusions (*)
      `,
      { count: 'exact' },
    );

  if (normalizedFilters.searchQuery) {
    const term = normalizedFilters.searchQuery;
    query = query.or(
      [
        `title_name.ilike.%${term}%`,
        `name.ilike.%${term}%`,
        `summary.ilike.%${term}%`,
      ].join(','),
    );
  }

  if (normalizedFilters.tags && normalizedFilters.tags.length > 0) {
    const { data: recordIds } = await supabase
      .from('record_tags')
      .select('record_id')
      .in('tag_id', normalizedFilters.tags);

    if (recordIds && recordIds.length > 0) {
      query = query.in(
        'id',
        recordIds.map((record) => record.record_id),
      );
    } else {
      return {
        data: [],
        count: 0,
        page,
        pageSize,
        totalPages: 0,
      };
    }
  }

  if (normalizedFilters.authors && normalizedFilters.authors.length > 0) {
    const { data: recordIds } = await supabase
      .from('record_authors')
      .select('record_id')
      .in('author_id', normalizedFilters.authors);

    if (recordIds && recordIds.length > 0) {
      query = query.in(
        'id',
        recordIds.map((record) => record.record_id),
      );
    } else {
      return {
        data: [],
        count: 0,
        page,
        pageSize,
        totalPages: 0,
      };
    }
  }

  if (normalizedFilters.magazine) {
    query = query.ilike('name', `%${normalizedFilters.magazine}%`);
  }

  if (normalizedFilters.language) {
    query = query.eq('language', normalizedFilters.language);
  }

  if (normalizedFilters.yearRange?.start) {
    query = query.gte('timestamp', `${normalizedFilters.yearRange.start}-01-01`);
  }
  if (normalizedFilters.yearRange?.end) {
    query = query.lte('timestamp', `${normalizedFilters.yearRange.end}-12-31`);
  }

  query = applySorting(query, sort);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching records:', error);
    throw error;
  }

  const response: PaginatedResponse<RecordWithDetails> = {
    data: (data ?? []) as RecordWithDetails[],
    count: count ?? 0,
    page,
    pageSize,
    totalPages: count ? Math.ceil(count / pageSize) : 0,
  };

  await writeCache(cacheKey, response);
  return response;
}

export async function fetchRecordById(id: number): Promise<RecordWithDetails | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('records')
    .select(
      `
        *,
        record_authors (
          author_id,
          authors (*)
        ),
        record_tags (
          tag_id,
          tags (*)
        ),
        summaries (*),
        conclusions (*)
      `,
    )
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching record by ID:', error);
    throw error;
  }

  return data as RecordWithDetails;
}

async function fetchLookup<T>(table: 'tags' | 'authors', ttl: number): Promise<T[]> {
  const cacheKey = JSON.stringify({ table });
  const cached = await readCache<T[]>(cacheKey, ttl);
  if (cached) {
    return cached;
  }

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error(`Error fetching ${table}:`, error);
    throw error;
  }

  const result = data ?? [];
  await writeCache(cacheKey, result);
  return result as T[];
}

export async function fetchAllTags(): Promise<Tag[]> {
  return fetchLookup<Tag>('tags', LOOKUP_CACHE_TTL);
}

export async function fetchAllAuthors(): Promise<Author[]> {
  return fetchLookup<Author>('authors', LOOKUP_CACHE_TTL);
}
