import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase, getJobsTable } from '../lib/supabase.js';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const supabase = getSupabase();
    const { count, error } = await supabase
      .from(getJobsTable())
      .select('*', { count: 'exact', head: true });

    if (error) {
      return res.status(503).json({
        status: 'degraded',
        storage: 'unhealthy',
        error: error.message,
      });
    }

    return res.status(200).json({
      status: 'ok',
      storage: 'healthy',
      jobCount: count || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(503).json({
      status: 'error',
      storage: 'unreachable',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
