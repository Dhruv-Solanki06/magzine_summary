// api/api.ts - Supabase API calls
import { createClient } from '@supabase/supabase-js';
import { RecordWithDetails, PaginatedResponse, SearchFilters, Tag, Author } from '../../../types';

const supabase = createClient("https://hzdjfyzrladnxjerisnm.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6ZGpmeXpybGFkbnhqZXJpc25tIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODg3NTAzMywiZXhwIjoyMDY0NDUxMDMzfQ.ahutTLsn1yeAzCEFzJpxxECyW4LX6AQo7euBAMMlXQ4");

//const supabase = createClient(process.env.SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "");
/**
 * Fetch paginated records with all related data
 */
export async function fetchRecords(
  page: number = 1,
  pageSize: number = 20,
  filters?: SearchFilters
): Promise<PaginatedResponse<RecordWithDetails>> {
  try {
    let query = supabase
      .from('records')
      .select(`
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
      `, { count: 'exact' });

    // Apply search filter
    if (filters?.searchQuery) {
      query = query.or(
        `title_name.ilike.%${filters.searchQuery}%,` +
        `name.ilike.%${filters.searchQuery}%,` +
        `summary.ilike.%${filters.searchQuery}%`
      );
    }

    // Apply tag filter
    if (filters?.tags && filters.tags.length > 0) {
      // Create a subquery for records that have any of the specified tags
      const { data: recordIds } = await supabase
        .from('record_tags')
        .select('record_id')
        .in('tag_id', filters.tags);
      
      if (recordIds && recordIds.length > 0) {
        const ids = recordIds.map(r => r.record_id);
        query = query.in('id', ids);
      }
    }

    // Apply author filter
    if (filters?.authors && filters.authors.length > 0) {
      const { data: recordIds } = await supabase
        .from('record_authors')
        .select('record_id')
        .in('author_id', filters.authors);
      
      if (recordIds && recordIds.length > 0) {
        const ids = recordIds.map(r => r.record_id);
        query = query.in('id', ids);
      }
    }

    // Apply magazine filter
    if (filters?.magazine) {
      query = query.ilike('name', `%${filters.magazine}%`);
    }

    // Apply language filter
    if (filters?.language) {
      query = query.eq('language', filters.language);
    }

    // Apply year range filter
    if (filters?.yearRange?.start || filters?.yearRange?.end) {
      if (filters.yearRange.start) {
        query = query.gte('timestamp', `${filters.yearRange.start}-01-01`);
      }
      if (filters.yearRange.end) {
        query = query.lte('timestamp', `${filters.yearRange.end}-12-31`);
      }
    }

    // Sorting alphabetically by title_name
    query = query.order('title_name', { ascending: true, nullsFirst: false });

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching records:', error);
      throw error;
    }

    const totalPages = count ? Math.ceil(count / pageSize) : 0;

    return {
      data: data as RecordWithDetails[] || [],
      count: count || 0,
      page,
      pageSize,
      totalPages,
    };
  } catch (error) {
    console.error('Error in fetchRecords:', error);
    throw error;
  }
}

/**
 * Fetch all tags
 */
export async function fetchTags(): Promise<Tag[]> {
  try {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching tags:', error);
    throw error;
  }
}

/**
 * Fetch all authors
 */
export async function fetchAuthors(): Promise<Author[]> {
  try {
    const { data, error } = await supabase
      .from('authors')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching authors:', error);
    throw error;
  }
}

/**
 * Fetch a single record by ID with all details
 */
export async function fetchRecordById(id: number): Promise<RecordWithDetails | null> {
  try {
    const { data, error } = await supabase
      .from('records')
      .select(`
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
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    return data as RecordWithDetails;
  } catch (error) {
    console.error('Error fetching record by ID:', error);
    throw error;
  }
}

/**
 * Search records by query
 */
export async function searchRecords(
  searchQuery: string,
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedResponse<RecordWithDetails>> {
  return fetchRecords(page, pageSize, { searchQuery });
}

/**
 * Filter records by tag
 */
export async function filterRecordsByTag(
  tagId: number,
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedResponse<RecordWithDetails>> {
  return fetchRecords(page, pageSize, { tags: [tagId] });
}