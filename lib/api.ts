import { RecordWithDetails } from '@/types';

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
