import type { NextApiRequest, NextApiResponse } from 'next';
import { listResearchers } from '@/lib/server/profiles';
import { RESEARCHERS_PAGE_SIZE, type ResearcherSortValue } from '@/lib/profiles';

const SORTS: ResearcherSortValue[] = [
  'complete',
  'alphabetical',
  'publications',
  'projects',
  'recent',
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const first = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;

  const search = first(req.query.search) ?? '';
  const sortParam = first(req.query.sort) as ResearcherSortValue | undefined;
  const sort = sortParam && SORTS.includes(sortParam) ? sortParam : 'complete';
  const page = Math.max(1, Number(first(req.query.page)) || 1);

  try {
    const results = await listResearchers({
      search,
      sort,
      page,
      pageSize: RESEARCHERS_PAGE_SIZE,
    });
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(results);
  } catch (error) {
    console.error('[api/researchers] failed', error);
    res.status(500).json({ error: 'Unable to load researchers right now.' });
  }
}
