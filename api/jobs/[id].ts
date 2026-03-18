import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase, getJobsTable } from '../../lib/supabase.js';
import { getClientIP, rateLimitOrReject, RATE_LIMITS } from '../../lib/rate-limit.js';
import type { Job } from '../../shared/types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }

  const ip = getClientIP(req as unknown as Request);
  if (rateLimitOrReject(ip, RATE_LIMITS.jobDetail, res)) return;

  try {
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Job ID required', code: 'BAD_REQUEST' });
    }

    // Basic UUID format check
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(id)) {
      return res.status(400).json({ error: 'Invalid job ID format', code: 'BAD_REQUEST' });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(getJobsTable())
      .select('*')
      .eq('id', id)
      .eq('status', 'active')
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Job not found', code: 'NOT_FOUND' });
    }

    return res.status(200).json(data as Job);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
}
