import { getSupabase, getJobsTable } from '../lib/supabase.js';
import { apiHandler } from '../lib/api-handler.js';
import { logger } from '../lib/logger.js';
import { RATE_LIMITS } from '../lib/rate-limit.js';

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

    const validActions = ['accepted', 'declined', 'more_info'];
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

    // Map action to new status — more_info keeps status as 'contacted'
    const now = new Date().toISOString();
    const statusUpdate: Record<string, unknown> = {
      contact_response: action,
      contact_responded_at: now,
      contact_note: note?.trim() || null,
    };

    // Only change status for accept/decline — more_info stays as 'contacted'
    if (action === 'accepted' || action === 'declined') {
      statusUpdate.status = action === 'accepted' ? 'accepted' : 'declined';
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

    // Fetch job details for emails
    const { data: job } = await supabase
      .from(getJobsTable())
      .select('id, title, company, submitter_name, submitter_email')
      .eq('id', intro.job_id)
      .single();

    const jobTitle = job?.title || 'Unknown Role';
    const jobCompany = job?.company || 'Unknown Company';

    // Fire notification emails (non-blocking)
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
        // Notify admin: contact said yes — time to make the intro
        await email.notifyAdminIntroAccepted({
          ...baseOpts,
          contactName: job?.submitter_name || 'Hiring contact',
          contactNote: note?.trim() || undefined,
        });

        // Notify requester: great news!
        await email.sendIntroAccepted(baseOpts);
      } else if (action === 'declined') {
        // Notify admin: contact passed
        await email.notifyAdminIntroDeclined({
          ...baseOpts,
          contactName: job?.submitter_name || 'Hiring contact',
          contactNote: note?.trim() || undefined,
        });

        // Notify requester: they passed (kind letdown)
        await email.sendIntroDeclined(baseOpts);
      }
      // 'more_info' — just notifies admin, no requester email
      if (action === 'more_info') {
        await email.notifyAdminIntroMoreInfo({
          ...baseOpts,
          contactName: job?.submitter_name || 'Hiring contact',
          contactNote: note?.trim() || undefined,
        });
      }
    } catch (err) {
      logger.warn('Email send failed after contact response', { introId: intro.id, error: err });
    }

    return res.status(200).json({
      success: true,
      action,
      message:
        action === 'accepted'
          ? "Thanks! We'll send the introduction shortly."
          : action === 'more_info'
            ? "Got it - we'll follow up with more details."
            : 'Thanks for letting us know.',
    });
  },
);
