import type { NextApiRequest, NextApiResponse } from 'next';
import { getTagsByIds, searchTags } from '@/lib/server/records';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  try {
    const idsParam = first(req.query.ids);
    if (idsParam) {
      const ids = idsParam
        .split(',')
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n));
      const tags = await getTagsByIds(ids);
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
      return res.status(200).json({ tags });
    }

    const q = first(req.query.q) ?? '';
    const limit = Math.min(Number(first(req.query.limit) ?? 20) || 20, 50);
    const tags = await searchTags(q, limit);
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    return res.status(200).json({ tags });
  } catch (error) {
    console.error('API /api/tags error:', error);
    return res.status(500).json({ message: 'Failed to load tags' });
  }
}
