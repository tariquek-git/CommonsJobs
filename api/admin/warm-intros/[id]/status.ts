import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../../../../lib/auth.js';
import { getSupabase, getJobsTable } from '../../../../lib/supabase.js';
import { logger } from '../../../../lib/logger.js';

const VALID_STATUSES = ['pending', 'contacted', 'connected', 'no_response'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }

  if (!requireAdmin(req as unknown as Request)) {
    return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
  }

  const id = req.query.id as string;
  if (!id) {
    return res.status(400).json({ error: 'Missing intro ID', code: 'VALIDATION_ERROR' });
  }

  const { status, contact_name, contact_email, contact_role } = req.body || {};
  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
      code: 'VALIDATION_ERROR',
    });
  }

  try {
    const supabase = getSupabase();

    // Get full intro details for the emails
    const { data: intro, error: introError } = await supabase
      .from('warm_intros')
      .select('id, name, email, linkedin, message, job_id, status')
      .eq('id', id)
      .single();

    if (introError || !intro) {
      return res.status(404).json({ error: 'Intro not found', code: 'NOT_FOUND' });
    }

    const previousStatus = intro.status;

    // Update status
    const { data, error } = await supabase
      .from('warm_intros')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, status')
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update status', code: 'UPDATE_ERROR' });
    }

    // Fetch job details for emails
    const { data: job } = await supabase
      .from(getJobsTable())
      .select('id, title, company, submitter_name, submitter_email')
      .eq('id', intro.job_id)
      .single();

    const jobTitle = job?.title || 'Unknown Role';
    const jobCompany = job?.company || 'Unknown Company';

    // Auto-fire emails on status transitions — awaited for reliability
    const emailResults: { type: string; status: 'sent' | 'failed' | 'skipped'; error?: string }[] =
      [];

    if (previousStatus !== status) {
      try {
        const email = await import('../../../../lib/email.js');

        // Check what emails have already been sent for this intro to prevent duplicates
        const { data: existingLogs } = await supabase
          .from('email_logs')
          .select('event_type')
          .eq('related_warm_intro_id', id)
          .eq('status', 'sent');

        const alreadySent = new Set(
          (existingLogs || []).map((l: { event_type: string }) => l.event_type),
        );

        if (status === 'contacted' && !alreadySent.has('warm_intro_contacted')) {
          try {
            await email.sendIntroContacted({
              requesterName: intro.name,
              requesterEmail: intro.email,
              jobTitle,
              jobCompany,
              jobId: intro.job_id,
              introId: intro.id,
            });
            emailResults.push({ type: 'warm_intro_contacted', status: 'sent' });
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            logger.warn('Intro contacted email failed', { introId: id, error: err });
            emailResults.push({ type: 'warm_intro_contacted', status: 'failed', error: msg });
          }
        }

        if (status === 'connected' && !alreadySent.has('warm_intro_connection_requester')) {
          const cName = contact_name || job?.submitter_name;
          const cEmail = contact_email || job?.submitter_email;

          if (!cName || !cEmail) {
            logger.warn('Connected status set without contact email', {
              introId: id,
              contactName: cName,
              contactEmail: cEmail,
            });
            emailResults.push({
              type: 'warm_intro_connection',
              status: 'skipped',
              error: 'Missing contact name or email',
            });
          } else {
            try {
              await email.sendIntroToRequester({
                requesterName: intro.name,
                requesterEmail: intro.email,
                contactName: cName,
                contactEmail: cEmail,
                contactRole: contact_role,
                jobTitle,
                jobCompany,
                jobId: intro.job_id,
                introId: intro.id,
              });
              emailResults.push({ type: 'warm_intro_connection_requester', status: 'sent' });
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : 'Unknown error';
              logger.warn('Intro-to-requester email failed', { introId: id, error: err });
              emailResults.push({
                type: 'warm_intro_connection_requester',
                status: 'failed',
                error: msg,
              });
            }

            try {
              await email.sendIntroToContact({
                contactName: cName,
                contactEmail: cEmail,
                requesterName: intro.name,
                requesterEmail: intro.email,
                requesterLinkedin: intro.linkedin || undefined,
                requesterMessage: intro.message || undefined,
                jobTitle,
                jobCompany,
                jobId: intro.job_id,
                introId: intro.id,
              });
              emailResults.push({ type: 'warm_intro_connection_contact', status: 'sent' });
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : 'Unknown error';
              logger.warn('Intro-to-contact email failed', { introId: id, error: err });
              emailResults.push({
                type: 'warm_intro_connection_contact',
                status: 'failed',
                error: msg,
              });
            }
          }
        }

        if (status === 'no_response' && !alreadySent.has('warm_intro_no_response')) {
          try {
            await email.sendIntroNoResponse({
              requesterName: intro.name,
              requesterEmail: intro.email,
              jobTitle,
              jobCompany,
              jobId: intro.job_id,
              introId: intro.id,
            });
            emailResults.push({ type: 'warm_intro_no_response', status: 'sent' });
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            logger.warn('Intro no-response email failed', { introId: id, error: err });
            emailResults.push({ type: 'warm_intro_no_response', status: 'failed', error: msg });
          }
        }
      } catch (err: unknown) {
        logger.warn('Email module import failed for intro status', { introId: id, error: err });
        emailResults.push({ type: 'email_module', status: 'failed', error: 'Module load failed' });
      }
    }

    return res.status(200).json({
      success: true,
      intro: data,
      emails: emailResults,
    });
  } catch (err) {
    console.error('Admin Warm Intros Status API Error:', err);
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
}
