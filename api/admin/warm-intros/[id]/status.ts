import { getSupabase, getJobsTable } from '../../../../lib/supabase.js';
import { apiHandler } from '../../../../lib/api-handler.js';
import { logger } from '../../../../lib/logger.js';

const VALID_STATUSES = [
  'pending',
  'contacted',
  'accepted',
  'connected',
  'followed_up',
  'declined',
  'no_response',
];

type EmailResult = { type: string; status: 'sent' | 'failed' | 'skipped'; error?: string };

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

export default apiHandler(
  { methods: ['PATCH'], auth: 'admin', name: 'admin/warm-intros/[id]/status' },
  async (req, res) => {
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

    const supabase = getSupabase();

    // Fetch intro details
    const { data: intro, error: introError } = await supabase
      .from('warm_intros')
      .select('id, name, email, linkedin, message, job_id, status, response_token')
      .eq('id', id)
      .single();

    if (introError || !intro) {
      return res.status(404).json({ error: 'Intro not found', code: 'NOT_FOUND' });
    }

    const previousStatus = intro.status;

    // Update status
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('warm_intros')
      .update({ status, status_updated_at: now })
      .eq('id', id)
      .select('id, status')
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update status', code: 'UPDATE_ERROR' });
    }

    // Fetch job details
    const { data: job } = await supabase
      .from(getJobsTable())
      .select('id, title, company, submitter_name, submitter_email')
      .eq('id', intro.job_id)
      .single();

    const jobTitle = job?.title || 'Unknown Role';
    const jobCompany = job?.company || 'Unknown Company';
    const emailResults: EmailResult[] = [];

    // Fire emails on status transitions (with dedup)
    if (previousStatus !== status) {
      try {
        const email = await import('../../../../lib/email.js');

        // Check already-sent emails to prevent duplicates
        const { data: existingLogs } = await supabase
          .from('email_logs')
          .select('event_type')
          .eq('related_warm_intro_id', id)
          .eq('status', 'sent');

        const alreadySent = new Set(
          (existingLogs || []).map((l: { event_type: string }) => l.event_type),
        );

        const baseOpts = {
          requesterName: intro.name,
          requesterEmail: intro.email,
          jobTitle,
          jobCompany,
          jobId: intro.job_id,
          introId: intro.id,
        };

        // → contacted: notify requester + send outreach to hiring contact
        if (status === 'contacted') {
          if (!alreadySent.has('warm_intro_contacted')) {
            await trySendEmail(
              () => email.sendIntroContacted(baseOpts),
              'warm_intro_contacted',
              emailResults,
            );
          }

          // Send branded outreach to hiring contact with accept/decline buttons
          const cName = contact_name || job?.submitter_name;
          const cEmail = contact_email || job?.submitter_email;
          if (
            cName &&
            cEmail &&
            intro.response_token &&
            !alreadySent.has('warm_intro_outreach_contact')
          ) {
            await trySendEmail(
              () =>
                email.sendOutreachToContact({
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
                  responseToken: intro.response_token,
                }),
              'warm_intro_outreach_contact',
              emailResults,
            );
          }
        }

        // → connected: send actual intro emails to both sides
        if (status === 'connected' && !alreadySent.has('warm_intro_connection_requester')) {
          const cName = contact_name || job?.submitter_name;
          const cEmail = contact_email || job?.submitter_email;

          if (!cName || !cEmail) {
            logger.warn('Connected status set without contact info', { introId: id });
            emailResults.push({
              type: 'warm_intro_connection',
              status: 'skipped',
              error: 'Missing contact name or email',
            });
          } else {
            await trySendEmail(
              () =>
                email.sendIntroToRequester({
                  ...baseOpts,
                  contactName: cName,
                  contactEmail: cEmail,
                  contactRole: contact_role,
                }),
              'warm_intro_connection_requester',
              emailResults,
            );

            await trySendEmail(
              () =>
                email.sendIntroToContact({
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
                }),
              'warm_intro_connection_contact',
              emailResults,
            );
          }
        }

        // → declined: notify requester kindly
        if (status === 'declined' && !alreadySent.has('warm_intro_declined_requester')) {
          await trySendEmail(
            () => email.sendIntroDeclined({ ...baseOpts, introId: intro.id }),
            'warm_intro_declined_requester',
            emailResults,
          );
        }

        // → no_response: legacy fallback
        if (status === 'no_response' && !alreadySent.has('warm_intro_no_response')) {
          await trySendEmail(
            () => email.sendIntroNoResponse(baseOpts),
            'warm_intro_no_response',
            emailResults,
          );
        }
      } catch (err: unknown) {
        logger.warn('Email module import failed', { introId: id, error: err });
        emailResults.push({ type: 'email_module', status: 'failed', error: 'Module load failed' });
      }
    }

    return res.status(200).json({
      success: true,
      intro: data,
      emails: emailResults,
    });
  },
);
