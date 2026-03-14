import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../../lib/auth.js';
import { getSupabase, getJobsTable, getClicksTable } from '../../lib/supabase.js';
import { getEnv } from '../../lib/env.js';
import type { RuntimeInfo } from '../../shared/types.js';

const startTime = Date.now();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }

  if (!requireAdmin(req as unknown as Request)) {
    return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
  }

  try {
    const supabase = getSupabase();

    const [jobsResult, clicksResult] = await Promise.all([
      supabase.from(getJobsTable()).select('*', { count: 'exact', head: true }),
      supabase.from(getClicksTable()).select('*', { count: 'exact', head: true }),
    ]);

    const storageHealthy = !jobsResult.error && !clicksResult.error;

    const info: RuntimeInfo = {
      storage: {
        provider: getEnv('STORAGE_PROVIDER', 'supabase'),
        healthy: storageHealthy,
        jobCount: jobsResult.count || 0,
        clickCount: clicksResult.count || 0,
      },
      ai: {
        provider: 'claude',
        configured: !!getEnv('ANTHROPIC_API_KEY'),
      },
      uptime: Math.floor((Date.now() - startTime) / 1000),
    };

    return res.status(200).json(info);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
}
