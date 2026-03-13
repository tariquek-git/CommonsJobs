import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase, getJobsTable } from '../../lib/supabase.js';
import { validateSubmission, sanitizeSubmission } from '../../shared/validation.js';
import { checkRateLimit, getClientIP } from '../../lib/rate-limit.js';
import type { SubmissionPayload, SubmissionResponse } from '../../shared/types.js';

function generateRefId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const prefix = 'CJ';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}-${code}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }

  try {
    // Rate limit check
    const ip = getClientIP(req as unknown as Request);
    const rl = checkRateLimit(ip, 5, 60 * 1000); // 5 submissions per minute
    if (!rl.allowed) {
      return res.status(429).json({ error: 'Too many submissions. Please try again later.', code: 'RATE_LIMITED' });
    }

    // Validate
    const validation = validateSubmission(req.body);

    if (!validation.valid) {
      // Spam detection: silently accept but don't save
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

    // Sanitize
    const payload = sanitizeSubmission(req.body as SubmissionPayload);
    const submissionRef = generateRefId();

    // Attempt to resolve company logo from domain
    let companyLogoUrl: string | null = null;
    if (payload.company_url) {
      try {
        const domain = new URL(payload.company_url).hostname;
        companyLogoUrl = `https://logo.clearbit.com/${domain}`;
      } catch {
        // Ignore invalid URL
      }
    }

    const supabase = getSupabase();
    const { error } = await supabase.from(getJobsTable()).insert({
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
      submission_ref: submissionRef,
      submitter_email: payload.submitter_email || null,
      tags: payload.tags || [],
    });

    if (error) {
      console.error('Submission insert error:', error);
      return res.status(500).json({ error: 'Failed to save submission', code: 'STORAGE_ERROR' });
    }

    return res.status(201).json({
      success: true,
      submission_ref: submissionRef,
      message: 'Job submitted for review. It will appear publicly once approved.',
    } satisfies SubmissionResponse);
  } catch (err) {
    console.error('Submission error:', err);
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
}
