import type { NextApiRequest, NextApiResponse } from 'next';

// Lightweight liveness endpoint for the container HEALTHCHECK / load balancers.
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({ ok: true, ts: Date.now() });
}
