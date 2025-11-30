import type { NextApiRequest, NextApiResponse } from 'next';
import type { SearchFilters, SortOption } from '@/types';
import {
  fetchAllAuthors,
  fetchAllTags,
  fetchRecordsWithFilters,
} from '@/lib/server/records';

function parseNumberArray(value: string | string[] | undefined): number[] | undefined {
  if (!value) return undefined;

  const rawValues = Array.isArray(value) ? value : value.split(',');
  const numbers = rawValues
    .map((item) => Number(item))
    .filter((num) => Number.isFinite(num));

  return numbers.length > 0 ? numbers : undefined;
}

function parseString(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function clampPage(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function clampPageSize(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 20;
  }
  return Math.min(value, 50);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { query } = req;

  const page = clampPage(Number(query.page ?? 1));
  const pageSize = clampPageSize(Number(query.limit ?? query.pageSize ?? 20));
  const sort = (parseString(query.sort) ?? 'random') as SortOption;

  const filters: SearchFilters = {
    searchQuery: parseString(query.search) ?? parseString(query.searchQuery),
    magazine: parseString(query.magazine),
    language: parseString(query.language),
    tags: parseNumberArray(query.tags),
    authors: parseNumberArray(query.authors),
    yearRange: {
      start: Number.isFinite(Number(query.yearStart))
        ? Number(query.yearStart)
        : undefined,
      end: Number.isFinite(Number(query.yearEnd)) ? Number(query.yearEnd) : undefined,
    },
  };

  if (!filters.yearRange?.start && !filters.yearRange?.end) {
    filters.yearRange = undefined;
  }

  try {
    const response = await fetchRecordsWithFilters({ page, pageSize, filters, sort });
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json(response);
  } catch (error) {
    console.error('API /api/records error:', error);
    return res.status(500).json({ message: 'Failed to load records' });
  }
}

export { fetchAllAuthors, fetchAllTags, fetchRecordsWithFilters } from '@/lib/server/records';
