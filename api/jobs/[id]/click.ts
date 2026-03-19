import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase, getJobsTable, getClicksTable } from '../../../lib/supabase.js';
import { getClientIP, rateLimitOrReject, RATE_LIMITS } from '../../../lib/rate-limit.js';
import { createHash } from 'crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }

  const ip = getClientIP(req as unknown as Request);
  if (rateLimitOrReject(ip, RATE_LIMITS.click, res)) return;

  try {
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Job ID required', code: 'BAD_REQUEST' });
    }

    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(id)) {
      return res.status(400).json({ error: 'Invalid job ID format', code: 'BAD_REQUEST' });
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
      return res
        .status(403)
        .json({ error: 'Click tracking only for active jobs', code: 'FORBIDDEN' });
    }

    // Hash IP for privacy
    const ipHash = createHash('sha256').update(ip).digest('hex');

    const userAgent = (req.headers['user-agent'] as string) || null;
    const referrer = (req.headers['referer'] as string) || null;

    // Parse UTM params from request body
    const body = req.body || {};
    const utmSource = typeof body.utm_source === 'string' ? body.utm_source.slice(0, 100) : null;
    const utmMedium = typeof body.utm_medium === 'string' ? body.utm_medium.slice(0, 100) : null;
    const utmCampaign =
      typeof body.utm_campaign === 'string' ? body.utm_campaign.slice(0, 200) : null;

    const { error: clickError } = await supabase.from(getClicksTable()).insert({
      job_id: id,
      ip_hash: ipHash,
      user_agent: userAgent,
      referrer,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
    });

    if (clickError) {
      const { logger } = await import('../../../lib/logger.js');
      logger.error('Click tracking error', { endpoint: 'click', jobId: id, error: clickError });
      // Don't fail the request - click tracking is non-critical
    }

    return res.status(200).json({ tracked: true });
  } catch (err) {
    // Click tracking should never block - log and return success
    import('../../../lib/logger.js')
      .then(({ logger }) => {
        logger.warn('Click tracking exception', { endpoint: 'click', error: err });
      })
      .catch(() => {});
    return res.status(200).json({ tracked: false });
  }
}
