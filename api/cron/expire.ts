import { getSupabase, getJobsTable } from '../../lib/supabase.js';
import { sendJobExpired } from '../../lib/email.js';
import { apiHandler } from '../../lib/api-handler.js';
import { logger } from '../../lib/logger.js';

export default apiHandler(
  { methods: ['GET', 'POST'], auth: 'cron', name: 'cron/expire' },
  async (_req, res) => {
    const supabase = getSupabase();
    const now = new Date().toISOString();

    // Fetch jobs that need expiring (with submitter info for notifications)
    const { data, error } = await supabase
      .from(getJobsTable())
      .update({ status: 'archived', updated_at: now })
      .eq('status', 'active')
      .not('expires_at', 'is', null)
      .lt('expires_at', now)
      .select('id, title, company, submitter_name, submitter_email');

    if (error) {
      logger.error('Expire cron query error', { endpoint: 'cron/expire', error });
      return res.status(500).json({ error: 'Failed to expire jobs' });
    }

    // Notify submitters their listing expired (non-blocking)
    let notified = 0;
    for (const job of data || []) {
      if (job.submitter_email) {
        sendJobExpired({
          submitterName: job.submitter_name || 'there',
          submitterEmail: job.submitter_email,
          jobTitle: job.title,
          jobCompany: job.company,
          jobId: job.id,
        }).catch((err: unknown) => {
          logger.warn('Job expiration email failed', { jobId: job.id, error: err });
        });
        notified++;
      }
    }

    return res.status(200).json({
      expired: data?.length || 0,
      notified,
      timestamp: now,
    });
  },
);
