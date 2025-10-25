import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchRecordById } from '@/lib/server/records';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const {
    query: { id },
    method,
  } = req;

  if (method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const recordId = Number(Array.isArray(id) ? id[0] : id);

  if (!Number.isFinite(recordId)) {
    return res.status(400).json({ message: 'Invalid record id' });
  }

  try {
    const record = await fetchRecordById(recordId);

    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(record);
  } catch (error) {
    console.error('API /api/records/[id] error:', error);
    return res.status(500).json({ message: 'Failed to fetch record' });
  }
}
