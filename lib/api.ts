import { RecordWithDetails, SmartSearchResponse, SmartSearchResult } from '@/types';

type Primitive = string | number | boolean;
type FilterValue = Primitive | Primitive[] | undefined;

type FetchFilters = Record<string, FilterValue>;

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

function buildSearchParams(page: number, limit: number, filters: FetchFilters): URLSearchParams {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, String(item)));
      return;
    }

    params.append(key, String(value));
  });

  return params;
}

export async function fetchRecords(
  page = 1,
  limit = 10,
  filters: FetchFilters = {}
): Promise<{ data: RecordWithDetails[]; count?: number; totalPages?: number }> {
  try {
    const params = buildSearchParams(page, limit, filters);
    const response = await fetch(`${API_BASE}/records?${params.toString()}`);

    if (!response.ok) {
      throw new Error('Failed to fetch records');
    }

    return (await response.json()) as {
      data: RecordWithDetails[];
      count?: number;
      totalPages?: number;
    };
  } catch (error) {
    console.error('Error fetching records:', error);
    return { data: [] };
  }
}

export async function fetchRecordById(id: number): Promise<RecordWithDetails> {
  const response = await fetch(`${API_BASE}/records/${id}`);

  if (!response.ok) {
    throw new Error('Record not found');
  }

  return (await response.json()) as RecordWithDetails;
}

export interface SmartSearchResultSet {
  results: SmartSearchResult[];
  error?: string;
}

export async function smartSearch(query: string, limit = 20): Promise<SmartSearchResultSet> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { results: [] };
  }

  try {
    const response = await fetch(`${API_BASE}/smart-search?limit=${limit}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: trimmed }),
    });

    if (!response.ok) {
      let message = `Smart search failed with status ${response.status}`;
      try {
        const errorBody = await response.json();
        if (typeof errorBody?.message === 'string') {
          message = errorBody.message;
        } else {
          message = JSON.stringify(errorBody);
        }
      } catch (parseError) {
        try {
          const fallbackText = await response.text();
          if (fallbackText) {
            message = fallbackText;
          }
        } catch {
          // ignore
        }
      }

      return { results: [], error: message };
    }

    const payload = (await response.json()) as SmartSearchResponse;
    return { results: payload.results ?? [] };
  } catch (error) {
    console.error('Error performing smart search:', error);
    return {
      results: [],
      error: error instanceof Error ? error.message : 'Unexpected smart search error',
    };
  }
}
