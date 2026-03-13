import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runAggregation } from '../_lib/aggregator.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = req.headers['authorization']?.replace('Bearer ', '');
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await runAggregation();
    return res.status(200).json({
      ...result,
      message: `Cron aggregation complete. ${result.inserted} inserted, ${result.skipped} skipped, ${result.errors} errors.`,
    });
  } catch (err) {
    console.error('Cron aggregation error:', err);
    return res.status(500).json({ error: 'Aggregation failed' });
  }
}
