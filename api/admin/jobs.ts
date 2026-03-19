import { getSupabase, getJobsTable } from '../../lib/supabase.js';
import { apiHandler } from '../../lib/api-handler.js';

export default apiHandler(
  { methods: ['GET'], auth: 'admin', name: 'admin/jobs' },
  async (req, res) => {
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
  },
);
