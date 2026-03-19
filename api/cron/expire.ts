import { getSupabase, getJobsTable } from '../../lib/supabase.js';
import { apiHandler } from '../../lib/api-handler.js';
import { logger } from '../../lib/logger.js';

export default apiHandler(
  { methods: ['GET', 'POST'], auth: 'cron', name: 'cron/expire' },
  async (_req, res) => {
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
      logger.error('Expire cron query error', { endpoint: 'cron/expire', error });
      return res.status(500).json({ error: 'Failed to expire jobs' });
    }

    return res.status(200).json({
      expired: data?.length || 0,
      timestamp: now,
    });
  },
);
