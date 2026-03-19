import { getSupabase, getJobsTable } from '../../../lib/supabase.js';
import { apiHandler } from '../../../lib/api-handler.js';

export default apiHandler(
  { methods: ['GET', 'PATCH'], auth: 'admin', name: 'admin/jobs/[id]' },
  async (req, res) => {
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Job ID required', code: 'BAD_REQUEST' });
    }

    // GET — fetch a single job by ID
    if (req.method === 'GET') {
      const supabase = getSupabase();
      const { data, error } = await supabase.from(getJobsTable()).select('*').eq('id', id).single();

      if (error || !data) {
        return res.status(404).json({ error: 'Job not found', code: 'NOT_FOUND' });
      }
      return res.status(200).json(data);
    }

    // PATCH — update a job
    const allowedFields = [
      'title',
      'company',
      'location',
      'country',
      'description',
      'summary',
      'apply_url',
      'company_url',
      'company_logo_url',
      'source_type',
      'source_name',
      'tags',
      'salary_range',
      'employment_type',
      'work_arrangement',
      'warm_intro_ok',
      'category',
      'standout_perks',
      'status',
      'pinned',
    ];

    const updates: Record<string, unknown> = {};
    const body = req.body as Record<string, unknown>;

    const VALID_STATUSES = ['pending', 'active', 'rejected', 'archived', 'expired'];
    const typeChecks: Record<string, (v: unknown) => boolean> = {
      tags: (v) => Array.isArray(v),
      standout_perks: (v) => Array.isArray(v),
      pinned: (v) => typeof v === 'boolean',
      warm_intro_ok: (v) => typeof v === 'boolean',
      status: (v) => typeof v === 'string' && VALID_STATUSES.includes(v),
    };

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        const check = typeChecks[field];
        if (check && !check(body[field])) {
          return res.status(400).json({
            error: `Invalid type for field "${field}"`,
            code: 'VALIDATION_ERROR',
          });
        }
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update', code: 'BAD_REQUEST' });
    }

    updates.updated_at = new Date().toISOString();

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(getJobsTable())
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update job', code: 'STORAGE_ERROR' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Job not found', code: 'NOT_FOUND' });
    }

    return res.status(200).json(data);
  },
);
