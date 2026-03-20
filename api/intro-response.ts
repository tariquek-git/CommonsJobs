import { getSupabase, getJobsTable } from '../lib/supabase.js';
import { apiHandler } from '../lib/api-handler.js';
import { logger } from '../lib/logger.js';
import { RATE_LIMITS } from '../lib/rate-limit.js';

type EmailResult = { type: string; status: 'sent' | 'failed'; error?: string };

async function trySendEmail(fn: () => Promise<unknown>, eventType: string, results: EmailResult[]) {
  try {
    await fn();
    results.push({ type: eventType, status: 'sent' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    logger.warn(`Email failed: ${eventType}`, { error: err });
    results.push({ type: eventType, status: 'failed', error: msg });
  }
}

/**
 * Public endpoint — hiring contact clicks accept/decline from email.
 * Authenticated via response_token (UUID), not admin JWT.
 *
 * POST /api/intro-response
 * Body: { token, action: 'accepted' | 'declined' | 'more_info', note? }
 */
export default apiHandler(
  {
    methods: ['POST'],
    auth: 'none',
    rateLimit: RATE_LIMITS.introResponse,
    name: 'intro-response',
  },
  async (req, res) => {
    const { token, action, note } = req.body || {};

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Missing token', code: 'VALIDATION_ERROR' });
    }

    if (note && typeof note === 'string' && note.length > 1000) {
      return res
        .status(400)
        .json({ error: 'Note too long (max 1000 characters)', code: 'VALIDATION_ERROR' });
    }

    const validActions = ['accepted', 'declined'];
    if (!action || !validActions.includes(action)) {
      return res.status(400).json({
        error: `Invalid action. Must be one of: ${validActions.join(', ')}`,
        code: 'VALIDATION_ERROR',
      });
    }

    const supabase = getSupabase();

    // Look up intro by response_token
    const { data: intro, error: lookupError } = await supabase
      .from('warm_intros')
      .select('id, name, email, linkedin, message, job_id, status, contact_responded_at')
      .eq('response_token', token)
      .single();

    if (lookupError || !intro) {
      return res.status(404).json({
        error: 'Invalid or expired link',
        code: 'TOKEN_NOT_FOUND',
      });
    }

    // Prevent double-response
    if (intro.contact_responded_at) {
      return res.status(200).json({
        success: true,
        already_responded: true,
        message: 'You already responded to this request. Thank you!',
        current_status: intro.status,
      });
    }

    // Only allow response when status is 'contacted'
    if (intro.status !== 'contacted') {
      return res.status(200).json({
        success: true,
        already_responded: true,
        message: 'This intro request has already been updated.',
        current_status: intro.status,
      });
    }

    // Fetch job details for emails
    const { data: job } = await supabase
      .from(getJobsTable())
      .select('id, title, company, submitter_name, submitter_email')
      .eq('id', intro.job_id)
      .single();

    const jobTitle = job?.title || 'Unknown Role';
    const jobCompany = job?.company || 'Unknown Company';
    const contactName = job?.submitter_name || 'Hiring contact';
    const contactEmail = job?.submitter_email;

    // Map action to new status
    // accepted → auto-connect (skip the manual admin step)
    // declined → declined
    // more_info → stays as 'contacted'
    const now = new Date().toISOString();
    const statusUpdate: Record<string, unknown> = {
      contact_response: action,
      contact_responded_at: now,
      contact_note: note?.trim() || null,
    };

    if (action === 'accepted') {
      // Auto-connect: go straight to 'connected' and fire intro emails
      statusUpdate.status = 'connected';
      statusUpdate.status_updated_at = now;
    } else if (action === 'declined') {
      statusUpdate.status = 'declined';
      statusUpdate.status_updated_at = now;
    }

    const { error: updateError } = await supabase
      .from('warm_intros')
      .update(statusUpdate)
      .eq('id', intro.id);

    if (updateError) {
      logger.error('Failed to update intro response', { introId: intro.id, error: updateError });
      return res.status(500).json({ error: 'Failed to record response', code: 'UPDATE_ERROR' });
    }

    // Check already-sent emails to prevent duplicates
    const { data: existingLogs } = await supabase
      .from('email_logs')
      .select('event_type')
      .eq('related_warm_intro_id', intro.id)
      .eq('status', 'sent');

    const alreadySent = new Set(
      (existingLogs || []).map((l: { event_type: string }) => l.event_type),
    );

    // Fire emails (with dedup)
    const emailResults: EmailResult[] = [];
    try {
      const email = await import('../lib/email.js');

      const baseOpts = {
        requesterName: intro.name,
        requesterEmail: intro.email,
        jobTitle,
        jobCompany,
        jobId: intro.job_id,
        introId: intro.id,
      };

      if (action === 'accepted') {
        // 1. Notify admin (FYI — no action needed)
        if (!alreadySent.has('warm_intro_accepted_admin')) {
          await trySendEmail(
            () =>
              email.notifyAdminIntroAccepted({
                ...baseOpts,
                contactName,
                contactNote: note?.trim() || undefined,
              }),
            'warm_intro_accepted_admin',
            emailResults,
          );
        }

        // 2. Auto-send intro emails to both sides
        if (contactName && contactEmail) {
          if (!alreadySent.has('warm_intro_connection_requester')) {
            await trySendEmail(
              () =>
                email.sendIntroToRequester({
                  ...baseOpts,
                  contactName,
                  contactEmail,
                }),
              'warm_intro_connection_requester',
              emailResults,
            );
          }

          if (!alreadySent.has('warm_intro_connection_contact')) {
            await trySendEmail(
              () =>
                email.sendIntroToContact({
                  contactName,
                  contactEmail,
                  requesterName: intro.name,
                  requesterEmail: intro.email,
                  requesterLinkedin: intro.linkedin || undefined,
                  requesterMessage: intro.message || undefined,
                  jobTitle,
                  jobCompany,
                  jobId: intro.job_id,
                  introId: intro.id,
                }),
              'warm_intro_connection_contact',
              emailResults,
            );
          }
        } else {
          // No contact email — fall back to just accepted (admin will need to manually connect)
          logger.warn('Auto-connect skipped: no contact email on file', { introId: intro.id });
          // Revert to accepted status so admin can manually handle
          await supabase
            .from('warm_intros')
            .update({ status: 'accepted', status_updated_at: now })
            .eq('id', intro.id);

          // Still notify requester it's accepted
          await trySendEmail(
            () => email.sendIntroAccepted(baseOpts),
            'warm_intro_accepted_requester',
            emailResults,
          );
        }
      } else if (action === 'declined') {
        if (!alreadySent.has('warm_intro_declined_admin')) {
          await trySendEmail(
            () =>
              email.notifyAdminIntroDeclined({
                ...baseOpts,
                contactName,
                contactNote: note?.trim() || undefined,
              }),
            'warm_intro_declined_admin',
            emailResults,
          );
        }

        if (!alreadySent.has('warm_intro_declined_requester')) {
          await trySendEmail(
            () => email.sendIntroDeclined(baseOpts),
            'warm_intro_declined_requester',
            emailResults,
          );
        }
      }
    } catch (err) {
      logger.warn('Email send failed after contact response', { introId: intro.id, error: err });
    }

    logger.info('Contact responded to intro', {
      introId: intro.id,
      action,
      autoConnected: action === 'accepted' && !!contactEmail,
      emails: emailResults,
    });

    return res.status(200).json({
      success: true,
      action,
      message:
        action === 'accepted'
          ? "You're connected! Introduction emails have been sent to both sides."
          : 'Thanks for letting us know.',
    });
  },
);
