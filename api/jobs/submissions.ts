import { getSupabase, getJobsTable } from '../../lib/supabase.js';
import { validateSubmission, sanitizeSubmission } from '../../shared/validation.js';
import type { SubmissionPayload, SubmissionResponse } from '../../shared/types.js';
import { getClientIP, RATE_LIMITS } from '../../lib/rate-limit.js';
import { apiHandler } from '../../lib/api-handler.js';
import { logger } from '../../lib/logger.js';
import { createHash } from 'crypto';

function generateRefId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const prefix = 'CJ';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}-${code}`;
}

function normalizeUrl(url: unknown): unknown {
  if (!url || typeof url !== 'string' || !url.trim()) return url;
  let u = url.trim();
  if (!u.startsWith('https://') && !u.startsWith('http://')) {
    u = 'https://' + u;
  }
  if (u.startsWith('http://')) {
    u = 'https://' + u.slice(7);
  }
  return u;
}

export default apiHandler(
  { methods: ['POST'], rateLimit: RATE_LIMITS.submission, name: 'jobs/submissions' },
  async (req, res) => {
    // Normalize URLs before validation
    if (req.body && typeof req.body === 'object') {
      req.body.apply_url = normalizeUrl(req.body.apply_url);
      req.body.company_url = normalizeUrl(req.body.company_url);
    }

    const validation = validateSubmission(req.body);

    if (!validation.valid) {
      if (validation.errors.includes('__spam__')) {
        return res.status(200).json({
          success: true,
          submission_ref: generateRefId(),
          message: 'Job submitted for review.',
        } satisfies SubmissionResponse);
      }

      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validation.errors,
      });
    }

    const payload = sanitizeSubmission(req.body as SubmissionPayload);
    const submissionRef = generateRefId();

    let companyLogoUrl: string | null = null;
    if (payload.company_url) {
      try {
        const domain = new URL(payload.company_url).hostname;
        companyLogoUrl = `https://logo.clearbit.com/${domain}`;
      } catch {
        // Ignore invalid URL
      }
    }

    const ip = getClientIP(req);
    const ipHash = createHash('sha256').update(ip).digest('hex');
    const userAgent = (req.headers['user-agent'] as string) || null;
    const referrer = (req.headers['referer'] as string) || null;

    const supabase = getSupabase();
    const { data: inserted, error } = await supabase
      .from(getJobsTable())
      .insert({
        title: payload.title,
        company: payload.company,
        location: payload.location || null,
        country: payload.country || null,
        description: payload.description || null,
        summary: payload.summary || null,
        apply_url: payload.apply_url || null,
        company_url: payload.company_url || null,
        company_logo_url: companyLogoUrl,
        source_type: 'direct',
        source_name: 'community',
        status: 'pending',
        posted_date: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        submission_ref: submissionRef,
        submitter_name: payload.submitter_name || null,
        submitter_email: payload.submitter_email || null,
        tags: payload.tags || [],
        category: payload.category || null,
        standout_perks: payload.standout_perks || [],
        warm_intro_ok: payload.warm_intro_ok ?? true,
        salary_range: payload.salary_range || null,
        employment_type: payload.employment_type || null,
        work_arrangement: payload.work_arrangement || null,
        referral_source: payload.referral_source || null,
        submitter_ip_hash: ipHash,
        submitter_user_agent: userAgent,
        submitter_referrer: referrer,
      })
      .select('id')
      .single();

    if (error) {
      logger.error('Submission insert error', { endpoint: 'submissions', error });
      return res.status(500).json({ error: 'Failed to save submission', code: 'STORAGE_ERROR' });
    }

    // Send emails (non-blocking)
    import('../../lib/email.js')
      .then((email) => {
        email
          .notifyAdminNewSubmission({
            title: payload.title,
            company: payload.company,
            location: payload.location,
            submitterName: payload.submitter_name,
            submitterEmail: payload.submitter_email,
            referralSource: payload.referral_source,
            warmIntroOk: payload.warm_intro_ok ?? true,
            ref: submissionRef,
            jobId: inserted?.id,
          })
          .catch((err: unknown) => {
            logger.warn('Admin notification email failed', { error: err });
          });

        if (payload.submitter_email) {
          email
            .sendSubmissionConfirmation({
              submitterName: payload.submitter_name || 'there',
              submitterEmail: payload.submitter_email,
              jobTitle: payload.title,
              jobCompany: payload.company,
              ref: submissionRef,
              jobId: inserted?.id,
            })
            .catch((err: unknown) => {
              logger.warn('Submission confirmation email failed', { error: err });
            });
        }
      })
      .catch((err: unknown) => {
        logger.warn('Email module import failed', { error: err });
      });

    return res.status(201).json({
      success: true,
      submission_ref: submissionRef,
      message: 'Job submitted for review. It will appear publicly once approved.',
    } satisfies SubmissionResponse);
  },
);
