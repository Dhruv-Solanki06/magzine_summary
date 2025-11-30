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
    sort: sort ?? 'random',
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

function formatValue(value: unknown): unknown {
  if (typeof value !== 'string') {
    if (Array.isArray(value) && value.length === 1 && typeof value[0] === 'string') {
      return formatValue(value[0]);
    }
    return value === null || value === undefined ? '' : value;
  }

  if (!value.includes('[') && !value.includes('{') && !value.includes('"')) {
    return value.trim();
  }

  let parsed: unknown = value;

  if (
    (value.startsWith('[') && value.endsWith(']')) ||
    (value.startsWith('{') && value.endsWith('}'))
  ) {
    try {
      const jsonParsed = JSON.parse(value);
      if (Array.isArray(jsonParsed) && jsonParsed.length === 1 && typeof jsonParsed[0] === 'string') {
        parsed = jsonParsed[0];
      } else if (typeof jsonParsed === 'string') {
        parsed = jsonParsed;
      }
    } catch {
      // Keep original if parsing fails
    }
  }

  if (typeof parsed === 'string') {
    const unescaped = parsed
      .replace(/\\r\\n|\\n|\\r/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .replace(/\\\\/g, '\\')
      .trim();

    if (unescaped.length > 1 && unescaped.startsWith('"') && unescaped.endsWith('"')) {
      return unescaped.slice(1, -1);
    }

    return unescaped;
  }

  return parsed;
}

function sanitiseDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => sanitiseDeep(item)) as unknown as T;
  }

  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, val]) => {
      result[key] = sanitiseDeep(val);
    });
    return result as unknown as T;
  }

  return formatValue(value) as T;
}

function shuffleArray<T>(items: T[]): T[] {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function resolveRecordRestrictions(
  supabase: SupabaseClient,
  filters: SearchFilters,
): Promise<number[] | null> {
  let restrictedIds: number[] | null = null;

  if (filters.tags && filters.tags.length > 0) {
    const { data, error } = await supabase
      .from('record_tags')
      .select('record_id')
      .in('tag_id', filters.tags);

    if (error) {
      console.error('Error fetching tag filters:', error);
      throw error;
    }

    const tagIds = Array.from(new Set((data ?? []).map((record) => record.record_id)));
    if (tagIds.length === 0) {
      return [];
    }
    restrictedIds = tagIds;
  }

  if (filters.authors && filters.authors.length > 0) {
    const { data, error } = await supabase
      .from('record_authors')
      .select('record_id')
      .in('author_id', filters.authors);

    if (error) {
      console.error('Error fetching author filters:', error);
      throw error;
    }

    const authorIds = Array.from(new Set((data ?? []).map((record) => record.record_id)));
    if (authorIds.length === 0) {
      return [];
    }

    if (restrictedIds) {
      const authorSet = new Set(authorIds);
      restrictedIds = restrictedIds.filter((id) => authorSet.has(id));
    } else {
      restrictedIds = authorIds;
    }

    if (restrictedIds.length === 0) {
      return [];
    }
  }

  return restrictedIds;
}

export async function fetchRecordsWithFilters({
  page = 1,
  pageSize = 20,
  filters,
  sort,
}: RecordsRequest): Promise<PaginatedResponse<RecordWithDetails>> {
  const normalizedFilters = normaliseFilters(filters);
  const shouldUseCache = sort !== 'random';
  const cacheKey = shouldUseCache
    ? buildCacheKey({ page, pageSize, filters: normalizedFilters, sort })
    : null;

  if (shouldUseCache && cacheKey) {
    const cached = await readCache<PaginatedResponse<RecordWithDetails>>(cacheKey, RECORDS_CACHE_TTL);
    if (cached) {
      return sanitiseDeep(cached);
    }
  }

  const supabase = getSupabaseClient();
  const restrictedRecordIds = await resolveRecordRestrictions(supabase, normalizedFilters);
  if (restrictedRecordIds && restrictedRecordIds.length === 0) {
    return {
      data: [],
      count: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  }

  const applyFilterConditions = (inputQuery: any) => {
    let nextQuery = inputQuery;

    if (restrictedRecordIds && restrictedRecordIds.length > 0) {
      nextQuery = nextQuery.in('id', restrictedRecordIds);
    }

    if (normalizedFilters.searchQuery) {
      const term = normalizedFilters.searchQuery;
      nextQuery = nextQuery.or(
        [
          `title_name.ilike.%${term}%`,
          `name.ilike.%${term}%`,
          `summary.ilike.%${term}%`,
        ].join(','),
      );
    }

    if (normalizedFilters.magazine) {
      nextQuery = nextQuery.ilike('name', `%${normalizedFilters.magazine}%`);
    }

    if (normalizedFilters.language) {
      nextQuery = nextQuery.eq('language', normalizedFilters.language);
    }

    if (normalizedFilters.yearRange?.start) {
      nextQuery = nextQuery.gte('timestamp', `${normalizedFilters.yearRange.start}-01-01`);
    }

    if (normalizedFilters.yearRange?.end) {
      nextQuery = nextQuery.lte('timestamp', `${normalizedFilters.yearRange.end}-12-31`);
    }

    return nextQuery;
  };

  if (sort === 'random') {
    const idsQuery = applyFilterConditions(
      supabase.from('records').select('id', { count: 'exact' }),
    );

    const { data: idRows, error: idsError, count } = await idsQuery;
    if (idsError) {
      console.error('Error fetching record ids for random sort:', idsError);
      throw idsError;
    }

  const allIds: number[] = (idRows ?? []).map((row: { id: number }) => row.id);
    if (allIds.length === 0) {
      return {
        data: [],
        count: count ?? 0,
        page,
        pageSize,
        totalPages: 0,
      };
    }

    const shuffledIds = shuffleArray(allIds);
    const from = (page - 1) * pageSize;
    const to = from + pageSize;
  const pageIds: number[] = shuffledIds.slice(from, to);

    let records: RecordWithDetails[] = [];
    if (pageIds.length > 0) {
      const orderMap = new Map<number, number>();
      pageIds.forEach((id, index) => orderMap.set(id, index));

      const { data: randomData, error: randomError } = await applyFilterConditions(
        supabase
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
          .in('id', pageIds),
      );

      if (randomError) {
        console.error('Error fetching randomised records:', randomError);
        throw randomError;
      }

      const sanitised = sanitiseDeep((randomData ?? []) as RecordWithDetails[]);
      records = sanitised.sort(
        (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0),
      );
    }

    const totalCount = count ?? shuffledIds.length;
    return {
      data: records,
      count: totalCount,
      page,
      pageSize,
      totalPages: totalCount ? Math.ceil(totalCount / pageSize) : 0,
    };
  }

  let query: any = applyFilterConditions(
    supabase
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
      ),
  );

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
    data: sanitiseDeep((data ?? []) as RecordWithDetails[]),
    count: count ?? 0,
    page,
    pageSize,
    totalPages: count ? Math.ceil(count / pageSize) : 0,
  };

  if (shouldUseCache && cacheKey) {
    await writeCache(cacheKey, response);
  }

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

  return data ? (sanitiseDeep(data) as RecordWithDetails) : null;
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
