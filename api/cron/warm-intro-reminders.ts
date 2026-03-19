import { getSupabase, getJobsTable } from '../../lib/supabase.js';
import {
  sendNudgeAdmin,
  sendNudgeRequester,
  sendContactNudge,
  sendIntroFollowUp,
} from '../../lib/email.js';
import { apiHandler } from '../../lib/api-handler.js';
import { logger } from '../../lib/logger.js';

async function trySend(
  fn: () => Promise<unknown>,
  key: string,
  alreadySent: Set<string>,
  counts: { sent: number; errors: number },
): Promise<boolean> {
  if (alreadySent.has(key)) return false;
  try {
    await fn();
    counts.sent++;
    return true;
  } catch {
    counts.errors++;
    return false;
  }
}

export default apiHandler(
  { methods: ['GET', 'POST'], auth: 'cron', name: 'cron/warm-intro-reminders' },
  async (_req, res) => {
    const supabase = getSupabase();
    const now = Date.now();

    // Fetch intros in actionable statuses
    const { data: intros, error: introErr } = await supabase
      .from('warm_intros')
      .select('id, name, email, job_id, status, created_at, status_updated_at, response_token')
      .in('status', ['pending', 'contacted', 'connected'])
      .order('created_at', { ascending: true });

    if (introErr) {
      logger.error('Warm intro reminders: query error', { error: introErr });
      return res.status(500).json({ error: 'Failed to query intros' });
    }

    if (!intros || intros.length === 0) {
      return res.status(200).json({ message: 'No actionable intros', sent: 0 });
    }

    // Dedup: fetch already-sent nudge/follow-up emails
    const introIds = intros.map((i) => i.id);
    const { data: existingLogs } = await supabase
      .from('email_logs')
      .select('related_warm_intro_id, event_type')
      .in('related_warm_intro_id', introIds)
      .in('event_type', [
        'warm_intro_nudge_day5',
        'warm_intro_nudge_day10',
        'warm_intro_requester_update_day5',
        'warm_intro_requester_update_day10',
        'warm_intro_contact_nudge',
        'warm_intro_follow_up',
      ])
      .eq('status', 'sent');

    const alreadySent = new Set(
      (existingLogs || []).map(
        (l: { related_warm_intro_id: string; event_type: string }) =>
          `${l.related_warm_intro_id}:${l.event_type}`,
      ),
    );

    // Build job map
    const jobIds = [...new Set(intros.map((i) => i.job_id).filter(Boolean))];
    const jobMap: Record<
      string,
      {
        title: string;
        company: string;
        submitter_name: string | null;
        submitter_email: string | null;
      }
    > = {};
    if (jobIds.length > 0) {
      const { data: jobs } = await supabase
        .from(getJobsTable())
        .select('id, title, company, submitter_name, submitter_email')
        .in('id', jobIds);
      for (const job of jobs || []) {
        jobMap[job.id] = {
          title: job.title,
          company: job.company,
          submitter_name: job.submitter_name || null,
          submitter_email: job.submitter_email || null,
        };
      }
    }

    const counts = { sent: 0, errors: 0 };

    for (const intro of intros) {
      const job = jobMap[intro.job_id];
      if (!job) continue;

      const statusAge = Math.floor(
        (now - new Date(intro.status_updated_at || intro.created_at).getTime()) / 86400000,
      );

      // ── PENDING: nudge admin + requester at Day 5 and Day 10 ──
      if (intro.status === 'pending') {
        const baseOpts = {
          introId: intro.id,
          requesterName: intro.name,
          requesterEmail: intro.email,
          jobTitle: job.title,
          jobCompany: job.company,
          jobId: intro.job_id,
        };

        if (statusAge >= 5) {
          await trySend(
            () => sendNudgeAdmin({ ...baseOpts, day: 5 }),
            `${intro.id}:warm_intro_nudge_day5`,
            alreadySent,
            counts,
          );
          await trySend(
            () => sendNudgeRequester({ ...baseOpts, day: 5 }),
            `${intro.id}:warm_intro_requester_update_day5`,
            alreadySent,
            counts,
          );
        }

        if (statusAge >= 10) {
          await trySend(
            () => sendNudgeAdmin({ ...baseOpts, day: 10 }),
            `${intro.id}:warm_intro_nudge_day10`,
            alreadySent,
            counts,
          );
          await trySend(
            () => sendNudgeRequester({ ...baseOpts, day: 10 }),
            `${intro.id}:warm_intro_requester_update_day10`,
            alreadySent,
            counts,
          );
        }
      }

      // ── CONTACTED: nudge hiring contact at Day 5 ──
      if (intro.status === 'contacted' && statusAge >= 5) {
        const contactName = job.submitter_name;
        const contactEmail = job.submitter_email;

        if (contactName && contactEmail && intro.response_token) {
          await trySend(
            () =>
              sendContactNudge({
                contactName,
                contactEmail,
                requesterName: intro.name,
                jobTitle: job.title,
                jobCompany: job.company,
                jobId: intro.job_id,
                introId: intro.id,
                responseToken: intro.response_token,
              }),
            `${intro.id}:warm_intro_contact_nudge`,
            alreadySent,
            counts,
          );
        }
      }

      // ── CONNECTED: auto follow-up at Day 7 ──
      if (intro.status === 'connected' && statusAge >= 7) {
        const contactName = job.submitter_name || job.company;

        const followUpSent = await trySend(
          () =>
            sendIntroFollowUp({
              requesterName: intro.name,
              requesterEmail: intro.email,
              contactName,
              jobTitle: job.title,
              jobCompany: job.company,
              jobId: intro.job_id,
              introId: intro.id,
            }),
          `${intro.id}:warm_intro_follow_up`,
          alreadySent,
          counts,
        );

        // Only update status to followed_up if email actually sent
        if (followUpSent) {
          await supabase
            .from('warm_intros')
            .update({ status: 'followed_up', status_updated_at: new Date().toISOString() })
            .eq('id', intro.id);
        }
      }

      // Rate limit: pause every 10 sends
      if (counts.sent > 0 && counts.sent % 10 === 0) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    logger.info('Warm intro reminders cron completed', {
      total: intros.length,
      ...counts,
    });

    return res.status(200).json({
      total: intros.length,
      ...counts,
      timestamp: new Date().toISOString(),
    });
  },
);
