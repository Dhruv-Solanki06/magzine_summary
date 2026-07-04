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
import { readCache, writeCache } from './cache';

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

const RECORDS_CACHE_TTL = 1000 * 60 * 5; // 5 minutes
const LOOKUP_CACHE_TTL = 1000 * 60 * 30; // 30 minutes

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

function scoreRecord(rec: RecordWithDetails, tokens: string[], phrase: string): number {
  const title = rec.title_name ?? '';
  const authors = rec.authors ?? '';
  const summary = rec.summary ?? '';
  const conclusion = rec.conclusion ?? '';

  let score =
    4.0 * coverage(title, tokens) +
    2.0 * coverage(authors, tokens) +
    1.5 * coverage(summary, tokens) +
    1.2 * coverage(conclusion, tokens);

  const lowerPhrase = phrase.toLowerCase();
  if (lowerPhrase.length >= 3) {
    if (title.toLowerCase().includes(lowerPhrase)) score += 5;
    else if (summary.toLowerCase().includes(lowerPhrase)) score += 2;
    else if (conclusion.toLowerCase().includes(lowerPhrase)) score += 2;
    else if (authors.toLowerCase().includes(lowerPhrase)) score += 2;
  }
  return score;
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

  let candidateQuery: any = supabase
    .from('records')
    .select(RECORD_LIST_SELECT)
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

  const sanitised = sanitiseDeep((data ?? []) as RecordWithDetails[]);

  const yearStart = filters.yearRange?.start;
  const yearEnd = filters.yearRange?.end;

  const ranked = sanitised
    .map((rec) => ({ rec, relevance: scoreRecord(rec, tokens, phrase) }))
    .filter(({ rec, relevance }) => {
      if (relevance <= 0) return false;
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
    })
    .map(({ rec, relevance }) => {
      const { extracted_text: _text, ...rest } = rec as RecordWithDetails & {
        extracted_text?: unknown;
      };
      return { ...(rest as RecordWithDetails), relevance };
    });

  const count = ranked.length;
  const from = (page - 1) * pageSize;
  const pageData = ranked.slice(from, from + pageSize);

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

  const effectiveSort: SortOption =
    sort === 'relevance' || !sort ? 'title_asc' : sort;

  const shouldUseCache = effectiveSort !== 'random';
  const cacheKey = shouldUseCache
    ? JSON.stringify({ page, pageSize, sort: effectiveSort, filters: f })
    : null;

  if (shouldUseCache && cacheKey) {
    const cached = await readCache<PaginatedResponse<RecordWithDetails>>(
      cacheKey,
      RECORDS_CACHE_TTL,
    );
    if (cached) return cached;
  }

  // Random sort: pick a shuffle of matching ids, then page.
  if (effectiveSort === 'random') {
    let idsQuery: any = supabase.from('records').select('id', { count: 'exact' });
    if (restrictedIds && restrictedIds.length > 0) idsQuery = idsQuery.in('id', restrictedIds);
    idsQuery = applyColumnFilters(idsQuery, f, languageVariants);

    const { data: idRows, error: idsError, count } = await idsQuery;
    if (idsError) throw idsError;

    const allIds: number[] = (idRows ?? []).map((r: { id: number }) => r.id);
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

  const response: PaginatedResponse<RecordWithDetails> = {
    data: finalizeRecords(data),
    count: count ?? 0,
    page,
    pageSize,
    totalPages: count ? Math.ceil(count / pageSize) : 0,
  };

  if (shouldUseCache && cacheKey) await writeCache(cacheKey, response);
  return response;
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
}

/** Sibling articles in the same issue (same magazine + volume + number). */
export async function fetchRecordsFromSameIssue(
  record: RecordWithDetails,
): Promise<RecordWithDetails[]> {
  if (!record.magazine_id || !record.volume) return [];
  const supabase = getSupabaseClient();

  let q = supabase
    .from('records')
    .select(RECORD_SELECT)
    .eq('magazine_id', record.magazine_id)
    .eq('volume', record.volume);
  if (record.number) q = q.eq('number', record.number);

  const { data, error } = await q.limit(60);
  if (error) throw error;

  return finalizeRecords(data).sort(
    (a, b) => pagePosition(a.page_numbers) - pagePosition(b.page_numbers) || a.id - b.id,
  );
}

export async function fetchVolumeIssueSequence(
  record: RecordWithDetails,
): Promise<VolumeIssueNavItem[]> {
  if (!record.magazine_id || !record.volume) return [];
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
  const cacheKey = JSON.stringify({ magazines: 'stats-v1' });
  const cached = await readCache<MagazineWithStats[]>(cacheKey, LOOKUP_CACHE_TTL);
  if (cached) return cached;

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

  const result = withStats
    .filter((m) => m.recordCount > 0)
    .sort((a, b) => b.recordCount - a.recordCount);

  await writeCache(cacheKey, result);
  return result;
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

async function fetchLanguageFacets(supabase: SupabaseClient): Promise<LanguageFacet[]> {
  const cacheKey = JSON.stringify({ facet: 'languages-v1' });
  const cached = await readCache<LanguageFacet[]>(cacheKey, LOOKUP_CACHE_TTL);
  if (cached) return cached;

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

  const facets: LanguageFacet[] = Array.from(groups.entries())
    .map(([label, { variants, count }]) => ({
      label,
      variants: Array.from(variants),
      count,
    }))
    .sort((a, b) => b.count - a.count);

  await writeCache(cacheKey, facets);
  return facets;
}

export async function fetchLanguages(): Promise<LanguageFacet[]> {
  return fetchLanguageFacets(getSupabaseClient());
}

async function fetchLookup<T>(table: 'tags' | 'authors', ttl: number): Promise<T[]> {
  const cacheKey = JSON.stringify({ table });
  const cached = await readCache<T[]>(cacheKey, ttl);
  if (cached) return cached;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;

  const result = (data ?? []) as T[];
  await writeCache(cacheKey, result);
  return result;
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
