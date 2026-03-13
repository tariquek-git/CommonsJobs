import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../../lib/auth.js';
import { getSupabase, getJobsTable } from '../../lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }

  if (!requireAdmin(req as unknown as Request)) {
    return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
  }

  try {
    const status = req.query.status as string | undefined;
    const supabase = getSupabase();

    let query = supabase
      .from(getJobsTable())
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = (page - 1) * limit;

    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch jobs', code: 'STORAGE_ERROR' });
    }

    return res.status(200).json({
      jobs: data || [],
      meta: { total: count || 0, page, limit },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
}
