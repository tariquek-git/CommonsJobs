import { getSupabase, getJobsTable } from '../../lib/supabase.js';
import { getClientIP, RATE_LIMITS } from '../../lib/rate-limit.js';
import { apiHandler } from '../../lib/api-handler.js';
import { logger } from '../../lib/logger.js';
import { createHash } from 'crypto';

export default apiHandler(
  { methods: ['POST'], rateLimit: RATE_LIMITS.warmIntro, name: 'jobs/warm-intro' },
  async (req, res) => {
    const { job_id, name, email, linkedin, message, referrer_name, referrer_company } =
      req.body || {};

    if (!job_id || !name?.trim() || !email?.trim()) {
      return res.status(400).json({
        error: 'Name, email, and job ID are required',
        code: 'VALIDATION_ERROR',
      });
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(job_id)) {
      return res.status(400).json({ error: 'Invalid job ID format', code: 'VALIDATION_ERROR' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email', code: 'VALIDATION_ERROR' });
    }

    const ip = getClientIP(req);
    const ipHash = createHash('sha256').update(ip).digest('hex');
    const userAgent = (req.headers['user-agent'] as string) || null;
    const referrer = (req.headers['referer'] as string) || null;

    const supabase = getSupabase();

    const { data: intro, error } = await supabase
      .from('warm_intros')
      .insert({
        job_id,
        name: name.trim(),
        email: email.trim(),
        linkedin: linkedin?.trim() || null,
        message: message?.trim() || null,
        referrer_name: referrer_name?.trim() || null,
        referrer_company: referrer_company?.trim() || null,
        ip_hash: ipHash,
        user_agent: userAgent,
        referrer,
      })
      .select('id')
      .single();

    if (error) {
      logger.error('Warm intro insert error', { endpoint: 'warm-intro', error });
      return res.status(500).json({ error: 'Failed to save request', code: 'STORAGE_ERROR' });
    }

    // Fetch job details for emails
    const { data: job } = await supabase
      .from(getJobsTable())
      .select('title, company')
      .eq('id', job_id)
      .single();

    const jobTitle = job?.title || 'Unknown Role';
    const jobCompany = job?.company || 'Unknown Company';

    // Send emails (non-blocking)
    import('../../lib/email.js')
      .then(({ notifyAdminWarmIntro, sendWarmIntroThankYou }) => {
        notifyAdminWarmIntro({
          jobId: job_id,
          jobTitle,
          jobCompany,
          requesterName: name.trim(),
          requesterEmail: email.trim(),
          linkedin: linkedin?.trim(),
          message: message?.trim(),
          referrerName: referrer_name?.trim(),
          referrerCompany: referrer_company?.trim(),
          introId: intro?.id,
        }).catch((err: unknown) => {
          logger.warn('Admin warm intro notification failed', { error: err });
        });

        sendWarmIntroThankYou({
          requesterName: name.trim(),
          requesterEmail: email.trim(),
          jobTitle,
          jobCompany,
          jobId: job_id,
          introId: intro?.id,
        }).catch((err: unknown) => {
          logger.warn('Warm intro thank-you email failed', { error: err });
        });
      })
      .catch((err: unknown) => {
        logger.warn('Email module import failed', { error: err });
      });

    return res.status(201).json({
      success: true,
      message:
        "Your warm intro request has been submitted. I'll reach out to the job poster on your behalf.",
    });
  },
);
