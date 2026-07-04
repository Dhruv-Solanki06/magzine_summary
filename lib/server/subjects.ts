// lib/server/subjects.ts
// Read side of the subject taxonomy. Degrades gracefully (returns empty /
// not-ready) if the migration in supabase/migrations/0001_subjects.sql has
// not been applied yet.

import type { PaginatedResponse, RecordWithDetails, SortOption } from '@/types';
import { SUBJECTS as TAXONOMY } from '@/lib/taxonomy';
import {
  RECORD_LIST_SELECT,
  finalizeRecords,
  getSupabaseClient,
} from './records';

export interface SubjectRow {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
}

export interface SubjectWithCount extends SubjectRow {
  recordCount: number;
}

export interface SubsubjectWithCount {
  id: number;
  slug: string;
  name: string;
  recordCount: number;
}

function isMissingTable(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  if (!e) return false;
  return (
    e.code === '42P01' ||
    (typeof e.message === 'string' && /does not exist|schema cache/i.test(e.message))
  );
}

/** True once the taxonomy migration has been applied. */
export async function subjectsReady(): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('subject_areas').select('id').limit(1);
  return !error;
}

export async function fetchSubjectsWithCounts(): Promise<{
  ready: boolean;
  subjects: SubjectWithCount[];
}> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('subject_areas')
    .select('id, slug, name, description, sort_order')
    .order('sort_order', { ascending: true });

  if (error) {
    if (isMissingTable(error)) return { ready: false, subjects: [] };
    throw error;
  }

  const subjects = (data ?? []) as SubjectRow[];
  const withCounts = await Promise.all(
    subjects.map(async (s) => {
      const { count } = await supabase
        .from('record_subjects')
        .select('record_id', { count: 'exact', head: true })
        .eq('subject_id', s.id);
      return { ...s, recordCount: count ?? 0 };
    }),
  );

  return { ready: true, subjects: withCounts };
}

export async function fetchSubjectBySlug(slug: string): Promise<SubjectRow | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('subject_areas')
    .select('id, slug, name, description, sort_order')
    .eq('slug', slug)
    .limit(1);
  if (error) {
    if (isMissingTable(error)) return taxonomyFallbackSubject(slug);
    throw error;
  }
  return ((data ?? [])[0] as SubjectRow) ?? null;
}

function taxonomyFallbackSubject(slug: string): SubjectRow | null {
  const idx = TAXONOMY.findIndex((s) => s.slug === slug);
  if (idx === -1) return null;
  const s = TAXONOMY[idx];
  return { id: -1, slug: s.slug, name: s.name, description: s.description, sort_order: idx };
}

export async function fetchSubsubjectsWithCounts(
  subjectId: number,
): Promise<SubsubjectWithCount[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('subsubjects')
    .select('id, slug, name, sort_order')
    .eq('subject_id', subjectId)
    .order('sort_order', { ascending: true });
  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
  const subs = (data ?? []) as { id: number; slug: string; name: string }[];
  return Promise.all(
    subs.map(async (ss) => {
      const { count } = await supabase
        .from('record_subsubjects')
        .select('record_id', { count: 'exact', head: true })
        .eq('subsubject_id', ss.id);
      return { id: ss.id, slug: ss.slug, name: ss.name, recordCount: count ?? 0 };
    }),
  );
}

interface SubjectRecordsRequest {
  subjectId: number;
  subsubjectId?: number;
  page?: number;
  pageSize?: number;
  sort?: SortOption;
  search?: string;
}

/** Records that belong to a subject (or a specific sub-subject), paginated. */
export async function fetchRecordsBySubject({
  subjectId,
  subsubjectId,
  page = 1,
  pageSize = 20,
  sort = 'title_asc',
  search,
}: SubjectRecordsRequest): Promise<PaginatedResponse<RecordWithDetails>> {
  const supabase = getSupabaseClient();

  const linkTable = subsubjectId ? 'record_subsubjects' : 'record_subjects';
  const linkCol = subsubjectId ? 'subsubject_id' : 'subject_id';
  const linkVal = subsubjectId ?? subjectId;

  let query: any = supabase
    .from('records')
    .select(`${RECORD_LIST_SELECT}, ${linkTable}!inner(${linkCol})`, { count: 'exact' })
    .eq(`${linkTable}.${linkCol}`, linkVal);

  const term = search?.trim();
  if (term) {
    const safe = term.replace(/[,()%\\*]/g, ' ').trim();
    if (safe) {
      query = query.or(
        [
          `title_name.ilike.%${safe}%`,
          `summary.ilike.%${safe}%`,
          `conclusion.ilike.%${safe}%`,
          `authors.ilike.%${safe}%`,
        ].join(','),
      );
    }
  }

  switch (sort) {
    case 'title_desc':
      query = query.order('title_name', { ascending: false, nullsFirst: false });
      break;
    case 'newest':
      query = query.order('timestamp', { ascending: false, nullsFirst: false });
      break;
    case 'oldest':
      query = query.order('timestamp', { ascending: true, nullsFirst: false });
      break;
    default:
      query = query.order('title_name', { ascending: true, nullsFirst: false });
  }

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, error, count } = await query;
  if (error) {
    if (isMissingTable(error)) {
      return { data: [], count: 0, page, pageSize, totalPages: 0 };
    }
    throw error;
  }

  return {
    data: finalizeRecords(data),
    count: count ?? 0,
    page,
    pageSize,
    totalPages: count ? Math.ceil(count / pageSize) : 0,
  };
}
