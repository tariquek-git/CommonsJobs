import { getSupabase, getJobsTable, getClicksTable } from '../../../lib/supabase.js';
import { getClientIP, RATE_LIMITS } from '../../../lib/rate-limit.js';
import { apiHandler } from '../../../lib/api-handler.js';
import { logger } from '../../../lib/logger.js';
import { createHash } from 'crypto';

export default apiHandler(
  { methods: ['POST'], rateLimit: RATE_LIMITS.click, name: 'jobs/[id]/click' },
  async (req, res) => {
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Job ID required', code: 'BAD_REQUEST' });
    }

    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(id)) {
      return res.status(400).json({ error: 'Invalid job ID format', code: 'BAD_REQUEST' });
    }

    const supabase = getSupabase();

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

    const ip = getClientIP(req);
    const ipHash = createHash('sha256').update(ip).digest('hex');
    const userAgent = (req.headers['user-agent'] as string) || null;
    const referrer = (req.headers['referer'] as string) || null;

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
      logger.error('Click tracking error', { endpoint: 'click', jobId: id, error: clickError });
    }

    return res.status(200).json({ tracked: !clickError });
  },
);
