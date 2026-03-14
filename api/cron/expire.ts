import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase, getJobsTable } from '../../lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify the request is from Vercel Cron (CRON_SECRET must match)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const supabase = getSupabase();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from(getJobsTable())
      .update({ status: 'archived', updated_at: now })
      .eq('status', 'active')
      .not('expires_at', 'is', null)
      .lt('expires_at', now)
      .select('id');

    if (error) {
      const { logger } = await import('../../lib/logger.js');
      logger.error('Expire cron query error', { endpoint: 'cron/expire', error });
      return res.status(500).json({ error: 'Failed to expire jobs' });
    }

    return res.status(200).json({
      expired: data?.length || 0,
      timestamp: now,
    });
  } catch (err) {
    const { logger } = await import('../../lib/logger.js');
    logger.error('Expire cron handler error', { endpoint: 'cron/expire', error: err });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
