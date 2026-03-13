import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../../lib/auth.js';
import { runAggregation } from '../_lib/aggregator.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }

  if (!requireAdmin(req as unknown as Request)) {
    return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
  }

  try {
    const result = await runAggregation();

    return res.status(200).json({
      ...result,
      message: `Aggregation complete. ${result.inserted} new jobs inserted, ${result.skipped} skipped (duplicates), ${result.errors} errors.`,
    });
  } catch (err) {
    console.error('Aggregation error:', err);
    return res.status(500).json({ error: 'Aggregation failed', code: 'INTERNAL_ERROR' });
  }
}
