import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase, getJobsTable, getClicksTable } from '../../../lib/supabase.js';
import { getClientIP } from '../../../lib/rate-limit.js';
import { createHash } from 'crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Job ID required', code: 'BAD_REQUEST' });
    }

    const supabase = getSupabase();

    // Only track clicks for active jobs
    const { data: job, error: jobError } = await supabase
      .from(getJobsTable())
      .select('id, status')
      .eq('id', id)
      .single();

    if (jobError || !job) {
      return res.status(404).json({ error: 'Job not found', code: 'NOT_FOUND' });
    }

    if (job.status !== 'active') {
      return res.status(403).json({ error: 'Click tracking only for active jobs', code: 'FORBIDDEN' });
    }

    // Hash IP for privacy
    const ip = getClientIP(req as unknown as Request);
    const ipHash = createHash('sha256').update(ip).digest('hex');

    const { error: clickError } = await supabase.from(getClicksTable()).insert({
      job_id: id,
      ip_hash: ipHash,
    });

    if (clickError) {
      const { logger } = await import('../../../lib/logger.js');
      logger.error('Click tracking error', { endpoint: 'click', jobId: id, error: clickError });
      // Don't fail the request - click tracking is non-critical
    }

    return res.status(200).json({ tracked: true });
  } catch (err) {
    // Click tracking should never block - return success
    return res.status(200).json({ tracked: false });
  }
}
