import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  Author,
  Magazine,
  MagazineWithStats,
  PaginatedResponse,
  RecordWithDetails,
  SearchFilters,
  SortOption,
  Tag,
} from '@/types';
import { extractYear, formatLanguage } from '@/lib/format';
import { withCache } from './cache';

interface RecordsRequest {
  page?: number;
  pageSize?: number;
  filters?: SearchFilters;
  sort?: SortOption;
}

export interface VolumeIssueNavItem {
  volume: string | null;
  number: string | null;
  label: string;
  recordCount: number;
  firstRecordId: number;
  firstTitle: string | null;
  date: string | null;
  pageStart: string | null;
}

const RECORDS_CACHE_TTL = 1000 * 60 * 15; // 15 minutes
// Lookups (languages, magazine stats) are effectively static — the archive is
// not written to at runtime — so a short TTL only bought repeated full-table
// scans. See fetchLanguageFacets, which pages through every row.
const LOOKUP_CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours
// Single articles and issue navigation: immutable in practice, and hit on every
// article page view (including by crawlers walking all 8.5k records).
const RECORD_DETAIL_CACHE_TTL = 1000 * 60 * 60 * 6; // 6 hours

// Upper bound on the candidate pool we rank in-memory for keyword search.
const SEARCH_CANDIDATE_CAP = 400;
const ISSUE_SEQUENCE_CAP = 1000;

const MAGAZINE_SELECT =
  'magazines ( id, name, slug, short_name, description, cover_image_url, logo_image_url, website_url, headquarters, founded_year, issn_print, issn_online, is_active )';

// Explicit columns — deliberately EXCLUDES `extracted_text` (a large OCR blob)
// and `embedding`. ilike-scanning extracted_text across all rows times out, and
// shipping it to the client bloats payloads. It is not needed for browse/search.
const RECORD_COLUMNS =
  'id, magazine_id, timestamp, summary, pdf_url, volume, number, title_name, name_legacy, page_numbers, authors, language_legacy, email, creator_name, conclusion, pdf_public_id';

export const RECORD_SELECT = `
  ${RECORD_COLUMNS},
  ${MAGAZINE_SELECT},
  record_authors ( author_id, authors (*) ),
  record_tags ( tag_id, tags (*) ),
  summaries (*),
  conclusions (*)
`;

// Lightweight select for list / browse / search results. Omits the summaries
// and conclusions embeds and trims tag/author/magazine columns. This matters:
// with exact-count pagination PostgREST adds count(*) OVER(), which forces the
// embeds to be materialised for the WHOLE table on every page — the deep
// embeds above then time out at large offsets. Cards use the record's own
// `summary`/`conclusion` columns, so they don't need those embeds.
export const RECORD_LIST_SELECT = `
  ${RECORD_COLUMNS},
  magazines ( id, name, slug, short_name, cover_image_url, logo_image_url ),
  record_authors ( author_id, authors ( id, name ) ),
  record_tags ( tag_id, tags ( id, name ) )
`;

// Sibling-article list in IssueNavigator. It renders only the page number, the
// title and the author names, so the full record select (with its summaries /
// conclusions embeds) was shipping ~340KB per article view to render ~16KB of
// UI. Keep this in sync with what IssueNavigator actually reads.
const RECORD_ISSUE_SELECT = `
  id, magazine_id, timestamp, volume, number, title_name, page_numbers, authors,
  record_authors ( author_id, authors ( id, name ) )
`;

// Candidate pool for ranked keyword search. Deliberately excludes summary and
// conclusion: at a 400-row cap those two columns alone were ~1MB per search,
// and only the 20 rows of the requested page are ever rendered. Matching still
// covers them via the ilike filter in PostgREST; see keywordSearch.
const RECORD_SEARCH_CANDIDATE_SELECT = 'id, title_name, authors, timestamp';

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase credentials are not configured.');
  }

  cachedClient = createClient(url, key, {
    auth: { persistSession: false },
  });
  return cachedClient;
}

/* -------------------------------------------------------------------------- */
/*  Value sanitisation (some legacy rows store JSON-escaped strings)          */
/* -------------------------------------------------------------------------- */

function formatValue(value: unknown): unknown {
  if (typeof value !== 'string') {
    if (Array.isArray(value) && value.length === 1 && typeof value[0] === 'string') {
      return formatValue(value[0]);
    }
    return value;
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
      if (
        Array.isArray(jsonParsed) &&
        jsonParsed.length === 1 &&
        typeof jsonParsed[0] === 'string'
      ) {
        parsed = jsonParsed[0];
      } else if (typeof jsonParsed === 'string') {
        parsed = jsonParsed;
      }
    } catch {
      // keep original
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
    const result: globalThis.Record<string, unknown> = {};
    Object.entries(value as globalThis.Record<string, unknown>).forEach(([key, val]) => {
      // Never mangle the OCR blob — it's large and not shown raw.
      if (key === 'extracted_text' || key === 'embedding') {
        result[key] = val;
      } else {
        result[key] = sanitiseDeep(val);
      }
    });
    return result as unknown as T;
  }
  return formatValue(value) as T;
}

/** Drop heavy/irrelevant blobs before shipping rows to the client. */
function stripBlobs<T extends { extracted_text?: unknown }>(rows: T[]): T[] {
  for (const row of rows) {
    if (row && typeof row === 'object') {
      delete (row as { extracted_text?: unknown }).extracted_text;
      delete (row as { embedding?: unknown }).embedding;
    }
  }
  return rows;
}

export function finalizeRecords(rows: unknown): RecordWithDetails[] {
  return stripBlobs(sanitiseDeep((rows ?? []) as RecordWithDetails[]));
}

/* -------------------------------------------------------------------------- */
/*  Filters                                                                   */
/* -------------------------------------------------------------------------- */

function normaliseFilters(filters: SearchFilters | undefined): SearchFilters {
  if (!filters) return {};
  const n: SearchFilters = { ...filters };
  if (n.tags?.length === 0) n.tags = undefined;
  if (n.authors?.length === 0) n.authors = undefined;
  if (n.searchQuery && n.searchQuery.trim().length === 0) n.searchQuery = undefined;
  if (n.language && n.language.trim().length === 0) n.language = undefined;
  if (!n.magazineId || !Number.isFinite(n.magazineId)) n.magazineId = undefined;
  if (n.yearRange && !n.yearRange.start && !n.yearRange.end) n.yearRange = undefined;
  return n;
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
    if (error) throw error;
    const ids = Array.from(new Set((data ?? []).map((r) => r.record_id)));
    if (ids.length === 0) return [];
    restrictedIds = ids;
  }

  if (filters.authors && filters.authors.length > 0) {
    const { data, error } = await supabase
      .from('record_authors')
      .select('record_id')
      .in('author_id', filters.authors);
    if (error) throw error;
    const ids = Array.from(new Set((data ?? []).map((r) => r.record_id)));
    if (ids.length === 0) return [];
    if (restrictedIds) {
      const set = new Set(ids);
      restrictedIds = restrictedIds.filter((id) => set.has(id));
      if (restrictedIds.length === 0) return [];
    } else {
      restrictedIds = ids;
    }
  }

  return restrictedIds;
}

async function resolveLanguageVariants(
  supabase: SupabaseClient,
  label: string,
): Promise<string[]> {
  const languages = await fetchLanguageFacets(supabase);
  const match = languages.find((l) => l.label === label);
  return match ? match.variants : [label];
}

function applyColumnFilters(
  inputQuery: any,
  filters: SearchFilters,
  languageVariants: string[] | null,
) {
  let q = inputQuery;
  if (filters.magazineId) q = q.eq('magazine_id', filters.magazineId);
  if (languageVariants && languageVariants.length > 0) {
    q = q.in('language_legacy', languageVariants);
  }
  if (filters.yearRange?.start) {
    q = q.gte('timestamp', `${filters.yearRange.start}`);
  }
  if (filters.yearRange?.end) {
    // timestamp is free-form text; keep a coarse text upper bound. Precise
    // year filtering also happens in JS on the keyword-search path.
    q = q.lte('timestamp', `${filters.yearRange.end}￿`);
  }
  return q;
}

function applySorting(query: any, sort?: SortOption) {
  switch (sort) {
    case 'title_desc':
      return query.order('title_name', { ascending: false, nullsFirst: false });
    case 'newest':
      return query.order('timestamp', { ascending: false, nullsFirst: false });
    case 'oldest':
      return query.order('timestamp', { ascending: true, nullsFirst: false });
    case 'title_asc':
    default:
      return query.order('title_name', { ascending: true, nullsFirst: false });
  }
}

/* -------------------------------------------------------------------------- */
/*  Keyword search (ranked, in-memory over a bounded candidate pool)          */
/* -------------------------------------------------------------------------- */

function tokenize(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

/** Strip characters that would break a PostgREST `.or()` filter string. */
function sanitiseIlikeTerm(term: string): string {
  return term.replace(/[,()%\\*]/g, ' ').replace(/\s+/g, ' ').trim();
}

function coverage(field: string | null | undefined, tokens: string[]): number {
  if (!field || tokens.length === 0) return 0;
  const lower = field.toLowerCase();
  let hits = 0;
  for (const t of tokens) if (lower.includes(t)) hits += 1;
  return hits / tokens.length;
}

interface SearchCandidate {
  id: number;
  title_name: string | null;
  authors: string | null;
  timestamp: string | null;
}

/**
 * Rank a candidate on its high-signal fields only (title + authors).
 *
 * Body text (summary / conclusion) is intentionally not fetched for scoring —
 * see RECORD_SEARCH_CANDIDATE_SELECT. Every candidate reached us because
 * PostgREST already matched the query against title / authors / summary /
 * conclusion, so a row scoring 0 here is a body-only match: still relevant,
 * just ranked below title and author hits via BODY_MATCH_SCORE.
 */
const BODY_MATCH_SCORE = 0.5;

function scoreCandidate(rec: SearchCandidate, tokens: string[], phrase: string): number {
  const title = rec.title_name ?? '';
  const authors = rec.authors ?? '';

  let score = 4.0 * coverage(title, tokens) + 2.0 * coverage(authors, tokens);

  const lowerPhrase = phrase.toLowerCase();
  if (lowerPhrase.length >= 3) {
    if (title.toLowerCase().includes(lowerPhrase)) score += 5;
    else if (authors.toLowerCase().includes(lowerPhrase)) score += 2;
  }

  return score > 0 ? score : BODY_MATCH_SCORE;
}

async function keywordSearch(
  supabase: SupabaseClient,
  {
    query,
    filters,
    restrictedIds,
    languageVariants,
    page,
    pageSize,
  }: {
    query: string;
    filters: SearchFilters;
    restrictedIds: number[] | null;
    languageVariants: string[] | null;
    page: number;
    pageSize: number;
  },
): Promise<PaginatedResponse<RecordWithDetails>> {
  const phrase = sanitiseIlikeTerm(query);
  const tokens = Array.from(new Set(tokenize(phrase)));

  const orClauses: string[] = [];
  // Search title, summary, conclusion and authors. Never ilike-scan
  // extracted_text — it's a large OCR blob and times out.
  const fieldsForPhrase = ['title_name', 'summary', 'conclusion', 'authors'];
  if (phrase.length >= 2) {
    for (const f of fieldsForPhrase) orClauses.push(`${f}.ilike.%${phrase}%`);
  }
  // token-level recall on high-signal fields
  for (const t of tokens) {
    orClauses.push(`title_name.ilike.%${t}%`);
    orClauses.push(`authors.ilike.%${t}%`);
    orClauses.push(`summary.ilike.%${t}%`);
    orClauses.push(`conclusion.ilike.%${t}%`);
  }

  // Phase 1 — rank a cheap candidate pool (ids + title + authors only).
  let candidateQuery: any = supabase
    .from('records')
    .select(RECORD_SEARCH_CANDIDATE_SELECT)
    .limit(SEARCH_CANDIDATE_CAP);

  if (restrictedIds && restrictedIds.length > 0) {
    candidateQuery = candidateQuery.in('id', restrictedIds);
  }
  candidateQuery = applyColumnFilters(candidateQuery, filters, languageVariants);
  if (orClauses.length > 0) {
    candidateQuery = candidateQuery.or(orClauses.join(','));
  }

  const { data, error } = await candidateQuery;
  if (error) {
    console.error('Keyword search error:', error);
    throw error;
  }

  const sanitised = sanitiseDeep((data ?? []) as SearchCandidate[]);

  const yearStart = filters.yearRange?.start;
  const yearEnd = filters.yearRange?.end;

  const ranked = sanitised
    .map((rec) => ({ rec, relevance: scoreCandidate(rec, tokens, phrase) }))
    .filter(({ rec }) => {
      if (yearStart || yearEnd) {
        const year = extractYear(rec.timestamp);
        if (year === null) return false;
        if (yearStart && year < yearStart) return false;
        if (yearEnd && year > yearEnd) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (b.relevance !== a.relevance) return b.relevance - a.relevance;
      return (extractYear(b.rec.timestamp) ?? 0) - (extractYear(a.rec.timestamp) ?? 0);
    });

  const count = ranked.length;
  const from = (page - 1) * pageSize;
  const pageSlice = ranked.slice(from, from + pageSize);

  if (pageSlice.length === 0) {
    return { data: [], count, page, pageSize, totalPages: count ? Math.ceil(count / pageSize) : 0 };
  }

  // Phase 2 — hydrate only the rows this page will actually render.
  const pageIds = pageSlice.map(({ rec }) => rec.id);
  const relevanceById = new Map(pageSlice.map(({ rec, relevance }) => [rec.id, relevance]));

  const { data: fullRows, error: hydrateError } = await supabase
    .from('records')
    .select(RECORD_LIST_SELECT)
    .in('id', pageIds);
  if (hydrateError) throw hydrateError;

  const pageData = finalizeRecords(fullRows)
    .map((rec) => ({ ...rec, relevance: relevanceById.get(rec.id) ?? 0 }))
    .sort((a, b) => pageIds.indexOf(a.id) - pageIds.indexOf(b.id));

  return {
    data: pageData,
    count,
    page,
    pageSize,
    totalPages: count ? Math.ceil(count / pageSize) : 0,
  };
}

/* -------------------------------------------------------------------------- */
/*  Main browse query                                                         */
/* -------------------------------------------------------------------------- */

export async function fetchRecordsWithFilters({
  page = 1,
  pageSize = 20,
  filters,
  sort,
}: RecordsRequest): Promise<PaginatedResponse<RecordWithDetails>> {
  const supabase = getSupabaseClient();
  const f = normaliseFilters(filters);

  const effectiveSort: SortOption =
    sort === 'relevance' || !sort ? 'title_asc' : sort;

  // Random sort still varies per request (the shuffle happens in memory), but
  // every other result set — including keyword search, which previously
  // bypassed the cache entirely — is served read-through.
  if (effectiveSort !== 'random') {
    const cacheKey = JSON.stringify({ page, pageSize, sort: effectiveSort, filters: f });
    return withCache(cacheKey, RECORDS_CACHE_TTL, () =>
      loadRecords(supabase, { page, pageSize, filters: f, effectiveSort }),
    );
  }

  return loadRecords(supabase, { page, pageSize, filters: f, effectiveSort });
}

async function loadRecords(
  supabase: SupabaseClient,
  {
    page,
    pageSize,
    filters: f,
    effectiveSort,
  }: {
    page: number;
    pageSize: number;
    filters: SearchFilters;
    effectiveSort: SortOption;
  },
): Promise<PaginatedResponse<RecordWithDetails>> {
  const languageVariants = f.language
    ? await resolveLanguageVariants(supabase, f.language)
    : null;

  const restrictedIds = await resolveRecordRestrictions(supabase, f);
  if (restrictedIds && restrictedIds.length === 0) {
    return { data: [], count: 0, page, pageSize, totalPages: 0 };
  }

  // Keyword search takes its own ranked path.
  if (f.searchQuery) {
    return keywordSearch(supabase, {
      query: f.searchQuery,
      filters: f,
      restrictedIds,
      languageVariants,
      page,
      pageSize,
    });
  }

  // Random sort: pick a shuffle of matching ids, then page. The id pool is the
  // expensive half and does not depend on the shuffle, so it is cached — the
  // ordering stays random on every request, at no egress cost after the first.
  if (effectiveSort === 'random') {
    const poolKey = JSON.stringify({
      pool: 'random-ids-v1',
      filters: f,
      languageVariants,
      restrictedIds,
    });

    const { allIds, count } = await withCache(poolKey, RECORDS_CACHE_TTL, async () => {
      let idsQuery: any = supabase.from('records').select('id', { count: 'exact' });
      if (restrictedIds && restrictedIds.length > 0) idsQuery = idsQuery.in('id', restrictedIds);
      idsQuery = applyColumnFilters(idsQuery, f, languageVariants);

      const { data: idRows, error: idsError, count: total } = await idsQuery;
      if (idsError) throw idsError;

      return {
        allIds: (idRows ?? []).map((r: { id: number }) => r.id) as number[],
        count: (total ?? 0) as number,
      };
    });

    if (allIds.length === 0) {
      return { data: [], count: count ?? 0, page, pageSize, totalPages: 0 };
    }

    const pageIds = shuffleArray(allIds).slice((page - 1) * pageSize, page * pageSize);
    const orderMap = new Map<number, number>();
    pageIds.forEach((id, i) => orderMap.set(id, i));

    const { data, error } = await applyColumnFilters(
      supabase.from('records').select(RECORD_LIST_SELECT).in('id', pageIds),
      f,
      languageVariants,
    );
    if (error) throw error;

    const records = finalizeRecords(data).sort(
      (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0),
    );

    const total = count ?? allIds.length;
    return {
      data: records,
      count: total,
      page,
      pageSize,
      totalPages: total ? Math.ceil(total / pageSize) : 0,
    };
  }

  let query: any = supabase.from('records').select(RECORD_LIST_SELECT, { count: 'exact' });
  if (restrictedIds && restrictedIds.length > 0) query = query.in('id', restrictedIds);
  query = applyColumnFilters(query, f, languageVariants);
  query = applySorting(query, effectiveSort);

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    data: finalizeRecords(data),
    count: count ?? 0,
    page,
    pageSize,
    totalPages: count ? Math.ceil(count / pageSize) : 0,
  };
}

/* -------------------------------------------------------------------------- */
/*  Single record                                                             */
/* -------------------------------------------------------------------------- */

function firstNumber(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = String(value).match(/\d+/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function compareLooseNumber(a: string | null | undefined, b: string | null | undefined): number {
  const aNum = firstNumber(a);
  const bNum = firstNumber(b);
  if (aNum !== null && bNum !== null && aNum !== bNum) return aNum - bNum;
  if (aNum !== null && bNum === null) return -1;
  if (aNum === null && bNum !== null) return 1;
  return String(a ?? '').localeCompare(String(b ?? ''), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

function pagePosition(value: string | null | undefined): number {
  return firstNumber(value) ?? 999999;
}

export async function fetchRecordWithDetailsById(
  id: number,
): Promise<RecordWithDetails | null> {
  return withCache(
    JSON.stringify({ record: 'detail-v1', id }),
    RECORD_DETAIL_CACHE_TTL,
    async () => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('records')
        .select(RECORD_SELECT)
        .eq('id', id)
        .single();
      if (error) {
        if ((error as { code?: string }).code === 'PGRST116') return null;
        throw error;
      }
      return data ? finalizeRecords([data])[0] : null;
    },
  );
}

/**
 * Sibling articles in the same issue (same magazine + volume + number).
 *
 * Uses the trimmed issue select, not RECORD_SELECT: every article in an issue
 * asks for the same list, so this is both cached and ~20x smaller on the wire.
 */
export async function fetchRecordsFromSameIssue(
  record: RecordWithDetails,
): Promise<RecordWithDetails[]> {
  if (!record.magazine_id || !record.volume) return [];

  const cacheKey = JSON.stringify({
    issue: 'siblings-v2',
    magazine: record.magazine_id,
    volume: record.volume,
    number: record.number ?? null,
  });

  return withCache(cacheKey, RECORD_DETAIL_CACHE_TTL, async () => {
    const supabase = getSupabaseClient();

    let q = supabase
      .from('records')
      .select(RECORD_ISSUE_SELECT)
      .eq('magazine_id', record.magazine_id)
      .eq('volume', record.volume);
    if (record.number) q = q.eq('number', record.number);

    const { data, error } = await q.limit(60);
    if (error) throw error;

    return finalizeRecords(data).sort(
      (a, b) => pagePosition(a.page_numbers) - pagePosition(b.page_numbers) || a.id - b.id,
    );
  });
}

/**
 * "Continue reading" strip on an article page.
 *
 * Kept separate from fetchRecordsWithFilters' random path on purpose: that path
 * cannot cache its result (the shuffle differs per request), which meant one
 * uncached query on every single article view. Here the *result* is cached per
 * tag / magazine bucket, so the ordering still varies between buckets and over
 * time, but a crawler walking the whole archive no longer costs one query per
 * page.
 */
export async function fetchRelatedRecords(
  record: RecordWithDetails,
  limit = 9,
): Promise<RecordWithDetails[]> {
  const firstTag = record.record_tags?.[0]?.tags?.id;
  if (!firstTag && !record.magazine_id) return [];

  const cacheKey = JSON.stringify({
    related: 'v1',
    tag: firstTag ?? null,
    magazine: firstTag ? null : record.magazine_id,
    limit,
  });

  return withCache(cacheKey, RECORD_DETAIL_CACHE_TTL, async () => {
    const filters: SearchFilters = firstTag
      ? { tags: [firstTag] }
      : { magazineId: record.magazine_id ?? undefined };
    const response = await fetchRecordsWithFilters({
      page: 1,
      pageSize: limit,
      filters,
      sort: 'random',
    });
    return response.data;
  });
}

export async function fetchVolumeIssueSequence(
  record: RecordWithDetails,
): Promise<VolumeIssueNavItem[]> {
  if (!record.magazine_id || !record.volume) return [];

  // Shared by every article in the volume — one of the highest-value cache
  // keys here, since it pulls up to 1000 rows.
  const cacheKey = JSON.stringify({
    sequence: 'volume-v1',
    magazine: record.magazine_id,
    volume: record.volume,
  });

  return withCache(cacheKey, RECORD_DETAIL_CACHE_TTL, () =>
    loadVolumeIssueSequence(record),
  );
}

async function loadVolumeIssueSequence(
  record: RecordWithDetails,
): Promise<VolumeIssueNavItem[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('records')
    .select('id, timestamp, volume, number, title_name, page_numbers')
    .eq('magazine_id', record.magazine_id)
    .eq('volume', record.volume)
    .limit(ISSUE_SEQUENCE_CAP);
  if (error) throw error;

  type IssueLiteRow = {
    id: number;
    timestamp: string | null;
    volume: string | null;
    number: string | null;
    title_name: string | null;
    page_numbers: string | null;
  };

  const rows = sanitiseDeep((data ?? []) as IssueLiteRow[]);
  const groups = new Map<string, { number: string | null; rows: IssueLiteRow[] }>();

  rows.forEach((row) => {
    const number = row.number?.trim() || null;
    const key = number ?? '__unnumbered__';
    const group = groups.get(key) ?? { number, rows: [] };
    group.rows.push(row);
    groups.set(key, group);
  });

  return Array.from(groups.values())
    .map(({ number, rows: issueRows }) => {
      const sortedRows = [...issueRows].sort(
        (a, b) => pagePosition(a.page_numbers) - pagePosition(b.page_numbers) || a.id - b.id,
      );
      const first = sortedRows[0];
      return {
        volume: record.volume,
        number,
        label: number ? `No. ${number}` : 'Unnumbered',
        recordCount: issueRows.length,
        firstRecordId: first.id,
        firstTitle: first.title_name,
        date: first.timestamp,
        pageStart: first.page_numbers,
      };
    })
    .sort((a, b) => compareLooseNumber(a.number, b.number));
}

/* -------------------------------------------------------------------------- */
/*  Magazines                                                                 */
/* -------------------------------------------------------------------------- */

export async function fetchAllMagazinesWithStats(): Promise<MagazineWithStats[]> {
  return withCache(
    JSON.stringify({ magazines: 'stats-v1' }),
    LOOKUP_CACHE_TTL,
    loadAllMagazinesWithStats,
  );
}

async function loadAllMagazinesWithStats(): Promise<MagazineWithStats[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('magazines')
    .select(
      'id, name, slug, short_name, description, cover_image_url, logo_image_url, website_url, headquarters, founded_year, issn_print, issn_online, is_active',
    );
  if (error) throw error;

  const magazines = (data ?? []) as Magazine[];

  const withStats = await Promise.all(
    magazines.map(async (m) => {
      const { count } = await supabase
        .from('records')
        .select('id', { count: 'exact', head: true })
        .eq('magazine_id', m.id);
      return { ...m, recordCount: count ?? 0, yearStart: null, yearEnd: null };
    }),
  );

  return withStats
    .filter((m) => m.recordCount > 0)
    .sort((a, b) => b.recordCount - a.recordCount);
}

export async function fetchMagazineBySlug(
  slug: string,
): Promise<MagazineWithStats | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('magazines')
    .select(
      'id, name, slug, short_name, description, cover_image_url, logo_image_url, website_url, headquarters, founded_year, issn_print, issn_online, is_active',
    )
    .eq('slug', slug)
    .limit(1);
  if (error) throw error;
  const magazine = (data ?? [])[0] as Magazine | undefined;
  if (!magazine) return null;

  const { count } = await supabase
    .from('records')
    .select('id', { count: 'exact', head: true })
    .eq('magazine_id', magazine.id);

  return { ...magazine, recordCount: count ?? 0, yearStart: null, yearEnd: null };
}

/* -------------------------------------------------------------------------- */
/*  Facets (languages) & lookups (tags, authors)                              */
/* -------------------------------------------------------------------------- */

export interface LanguageFacet {
  label: string;
  variants: string[];
  count: number;
}

/**
 * Language filter options, derived by scanning `language_legacy` across the
 * whole table (there is no distinct-value endpoint in PostgREST). That is ~9
 * paged requests over 8.5k rows, so it must stay behind the 24h lookup cache —
 * the values only change when the archive is re-imported.
 */
async function fetchLanguageFacets(supabase: SupabaseClient): Promise<LanguageFacet[]> {
  return withCache(JSON.stringify({ facet: 'languages-v1' }), LOOKUP_CACHE_TTL, () =>
    loadLanguageFacets(supabase),
  );
}

async function loadLanguageFacets(supabase: SupabaseClient): Promise<LanguageFacet[]> {
  // Pull the raw language values in pages (client caps at 1000 rows/request).
  const raw: (string | null)[] = [];
  const pageSize = 1000;
  for (let start = 0; ; start += pageSize) {
    const { data, error } = await supabase
      .from('records')
      .select('language_legacy')
      .range(start, start + pageSize - 1);
    if (error) throw error;
    const rows = data ?? [];
    raw.push(...rows.map((r) => r.language_legacy as string | null));
    if (rows.length < pageSize) break;
  }

  const groups = new Map<string, { variants: Set<string>; count: number }>();
  for (const value of raw) {
    if (!value) continue;
    const label = formatLanguage(value) || value;
    const entry = groups.get(label) ?? { variants: new Set<string>(), count: 0 };
    entry.variants.add(value);
    entry.count += 1;
    groups.set(label, entry);
  }

  return Array.from(groups.entries())
    .map(([label, { variants, count }]) => ({
      label,
      variants: Array.from(variants),
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

export async function fetchLanguages(): Promise<LanguageFacet[]> {
  return fetchLanguageFacets(getSupabaseClient());
}

async function fetchLookup<T>(table: 'tags' | 'authors', ttl: number): Promise<T[]> {
  return withCache(JSON.stringify({ table }), ttl, async () => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return (data ?? []) as T[];
  });
}

export async function fetchAllAuthors(): Promise<Author[]> {
  return fetchLookup<Author>('authors', LOOKUP_CACHE_TTL);
}

/* -------------------------------------------------------------------------- */
/*  Typeahead lookups (tags & authors are far too numerous for static lists)  */
/* -------------------------------------------------------------------------- */

export async function searchTags(term: string, limit = 20): Promise<Tag[]> {
  const supabase = getSupabaseClient();
  const q = term.trim();
  let query = supabase
    .from('tags')
    .select('id, name, important')
    .order('important', { ascending: false, nullsFirst: false })
    .order('name', { ascending: true })
    .limit(limit);
  if (q) query = query.ilike('name', `%${q.replace(/[%_]/g, ' ')}%`);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Tag[];
}

export async function getTagsByIds(ids: number[]): Promise<Tag[]> {
  if (ids.length === 0) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('tags')
    .select('id, name, important')
    .in('id', ids);
  if (error) throw error;
  return (data ?? []) as Tag[];
}

export async function searchAuthors(term: string, limit = 20): Promise<Author[]> {
  const supabase = getSupabaseClient();
  const q = term.trim();
  let query = supabase
    .from('authors')
    .select('*')
    .order('name', { ascending: true })
    .limit(limit);
  if (q) query = query.ilike('name', `%${q.replace(/[%_]/g, ' ')}%`);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Author[];
}

export async function getAuthorsByIds(ids: number[]): Promise<Author[]> {
  if (ids.length === 0) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('authors').select('*').in('id', ids);
  if (error) throw error;
  return (data ?? []) as Author[];
}
