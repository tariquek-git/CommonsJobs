import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase, getJobsTable } from '../../lib/supabase.js';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
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
      console.error('Expire cron error:', error);
      return res.status(500).json({ error: 'Failed to expire jobs' });
    }

    return res.status(200).json({
      expired: data?.length || 0,
      timestamp: now,
    });
  } catch (err) {
    console.error('Expire cron error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
