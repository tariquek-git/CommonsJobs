import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase, getJobsTable } from '../../lib/supabase.js';
import { getClientIP, rateLimitOrReject, RATE_LIMITS } from '../../lib/rate-limit.js';
import { createHash } from 'crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }

  const ip = getClientIP(req);
  if (rateLimitOrReject(ip, RATE_LIMITS.warmIntro, res)) return;

  try {
    const { job_id, name, email, linkedin, message, referrer_name, referrer_company } =
      req.body || {};

    if (!job_id || !name?.trim() || !email?.trim()) {
      return res.status(400).json({
        error: 'Name, email, and job ID are required',
        code: 'VALIDATION_ERROR',
      });
    }

    // Basic email check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email', code: 'VALIDATION_ERROR' });
    }

    // Capture analytics metadata
    const ipHash = createHash('sha256').update(ip).digest('hex');
    const userAgent = (req.headers['user-agent'] as string) || null;
    const referrer = (req.headers['referer'] as string) || null;

    const supabase = getSupabase();

    // Store the intro request with analytics
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
      const { logger } = await import('../../lib/logger.js');
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
    const emailOps = import('../../lib/email.js').then(
      ({ notifyAdminWarmIntro, sendWarmIntroThankYou }) => {
        // 1. Notify admin
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
        }).catch(() => {});

        // 2. Send thank-you to requester
        sendWarmIntroThankYou({
          requesterName: name.trim(),
          requesterEmail: email.trim(),
          jobTitle,
          jobCompany,
          jobId: job_id,
          introId: intro?.id,
        }).catch(() => {});
      },
    );

    emailOps.catch(() => {});

    return res.status(201).json({
      success: true,
      message:
        "Your warm intro request has been submitted. I'll reach out to the job poster on your behalf.",
    });
  } catch (err) {
    const { logger } = await import('../../lib/logger.js');
    logger.error('Warm intro handler error', { endpoint: 'warm-intro', error: err });
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
}
