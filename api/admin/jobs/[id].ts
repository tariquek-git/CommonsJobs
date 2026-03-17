import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../../../lib/auth.js';
import { getSupabase, getJobsTable } from '../../../lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }

  if (!requireAdmin(req as unknown as Request)) {
    return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Job ID required', code: 'BAD_REQUEST' });
  }

  // GET — fetch a single job by ID
  if (req.method === 'GET') {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from(getJobsTable()).select('*').eq('id', id).single();

      if (error || !data) {
        return res.status(404).json({ error: 'Job not found', code: 'NOT_FOUND' });
      }

      return res.status(200).json(data);
    } catch {
      return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
    }
  }

  // PATCH — update a job
  try {
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

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
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
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
}
