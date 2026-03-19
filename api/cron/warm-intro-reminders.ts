import { getSupabase, getJobsTable } from '../../lib/supabase.js';
import { sendNudgeAdmin, sendNudgeRequester } from '../../lib/email.js';
import { apiHandler } from '../../lib/api-handler.js';
import { logger } from '../../lib/logger.js';

async function sendNudge(
  fn: (opts: {
    introId: string;
    requesterName: string;
    requesterEmail: string;
    jobTitle: string;
    jobCompany: string;
    jobId: string;
    day: 5 | 10;
  }) => Promise<boolean>,
  opts: {
    introId: string;
    requesterName: string;
    requesterEmail: string;
    jobTitle: string;
    jobCompany: string;
    jobId: string;
    day: 5 | 10;
  },
  alreadySent: Set<string>,
  eventType: string,
  counts: { sent: number; errors: number },
) {
  if (alreadySent.has(`${opts.introId}:${eventType}`)) return;
  try {
    await fn(opts);
    counts.sent++;
  } catch {
    counts.errors++;
  }
}

export default apiHandler(
  { methods: ['GET', 'POST'], auth: 'cron', name: 'cron/warm-intro-reminders' },
  async (_req, res) => {
    const supabase = getSupabase();
    const now = Date.now();

    const { data: pendingIntros, error: introErr } = await supabase
      .from('warm_intros')
      .select('id, name, email, job_id, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (introErr) {
      logger.error('Warm intro reminders: query error', { error: introErr });
      return res.status(500).json({ error: 'Failed to query intros' });
    }

    if (!pendingIntros || pendingIntros.length === 0) {
      return res.status(200).json({ message: 'No pending intros', sent: 0 });
    }

    // Dedup: fetch already-sent nudge emails
    const introIds = pendingIntros.map((i) => i.id);
    const { data: existingLogs } = await supabase
      .from('email_logs')
      .select('related_warm_intro_id, event_type')
      .in('related_warm_intro_id', introIds)
      .in('event_type', [
        'warm_intro_nudge_day5',
        'warm_intro_nudge_day10',
        'warm_intro_requester_update_day5',
        'warm_intro_requester_update_day10',
      ])
      .eq('status', 'sent');

    const alreadySent = new Set(
      (existingLogs || []).map(
        (l: { related_warm_intro_id: string; event_type: string }) =>
          `${l.related_warm_intro_id}:${l.event_type}`,
      ),
    );

    // Build job map
    const jobIds = [...new Set(pendingIntros.map((i) => i.job_id).filter(Boolean))];
    const jobMap: Record<string, { title: string; company: string }> = {};
    if (jobIds.length > 0) {
      const { data: jobs } = await supabase
        .from(getJobsTable())
        .select('id, title, company')
        .in('id', jobIds);
      for (const job of jobs || []) {
        jobMap[job.id] = { title: job.title, company: job.company };
      }
    }

    const counts = { sent: 0, errors: 0 };

    for (const intro of pendingIntros) {
      const daysOld = Math.floor((now - new Date(intro.created_at).getTime()) / 86400000);
      const job = jobMap[intro.job_id];
      if (!job) continue;

      const baseOpts = {
        introId: intro.id,
        requesterName: intro.name,
        requesterEmail: intro.email,
        jobTitle: job.title,
        jobCompany: job.company,
        jobId: intro.job_id,
      };

      if (daysOld >= 5) {
        await sendNudge(
          sendNudgeAdmin,
          { ...baseOpts, day: 5 },
          alreadySent,
          'warm_intro_nudge_day5',
          counts,
        );
        await sendNudge(
          sendNudgeRequester,
          { ...baseOpts, day: 5 },
          alreadySent,
          'warm_intro_requester_update_day5',
          counts,
        );
      }

      if (daysOld >= 10) {
        await sendNudge(
          sendNudgeAdmin,
          { ...baseOpts, day: 10 },
          alreadySent,
          'warm_intro_nudge_day10',
          counts,
        );
        await sendNudge(
          sendNudgeRequester,
          { ...baseOpts, day: 10 },
          alreadySent,
          'warm_intro_requester_update_day10',
          counts,
        );
      }

      if (counts.sent > 0 && counts.sent % 10 === 0) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    logger.info('Warm intro reminders cron completed', {
      pending: pendingIntros.length,
      ...counts,
    });

    return res.status(200).json({
      pending: pendingIntros.length,
      ...counts,
      timestamp: new Date().toISOString(),
    });
  },
);
