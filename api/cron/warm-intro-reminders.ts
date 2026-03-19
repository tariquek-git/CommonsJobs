import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase, getJobsTable } from '../../lib/supabase.js';
import { sendNudgeAdmin, sendNudgeRequester } from '../../lib/email.js';
import { logger } from '../../lib/logger.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return res.status(500).json({ error: 'CRON_SECRET not configured' });
  }
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabase = getSupabase();
    const now = Date.now();

    // Fetch all pending intros (only pending — if admin already contacted, no nudge needed)
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

    // Fetch existing nudge emails to avoid duplicates
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

    // Build set of already-sent nudges: "introId:eventType"
    const alreadySent = new Set(
      (existingLogs || []).map(
        (l: { related_warm_intro_id: string; event_type: string }) =>
          `${l.related_warm_intro_id}:${l.event_type}`,
      ),
    );

    // Fetch job details for all intros
    const jobIds = [...new Set(pendingIntros.map((i) => i.job_id).filter(Boolean))];
    let jobMap: Record<string, { title: string; company: string }> = {};

    if (jobIds.length > 0) {
      const { data: jobs } = await supabase
        .from(getJobsTable())
        .select('id, title, company')
        .in('id', jobIds);

      for (const job of jobs || []) {
        jobMap[job.id] = { title: job.title, company: job.company };
      }
    }

    let sentCount = 0;
    let errorCount = 0;

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

      // Day 5 nudges
      if (daysOld >= 5 && daysOld < 10) {
        if (!alreadySent.has(`${intro.id}:warm_intro_nudge_day5`)) {
          try {
            await sendNudgeAdmin({ ...baseOpts, day: 5 });
            sentCount++;
          } catch {
            errorCount++;
          }
        }
        if (!alreadySent.has(`${intro.id}:warm_intro_requester_update_day5`)) {
          try {
            await sendNudgeRequester({ ...baseOpts, day: 5 });
            sentCount++;
          } catch {
            errorCount++;
          }
        }
      }

      // Day 10 nudges
      if (daysOld >= 10) {
        // Send day 5 first if somehow missed
        if (!alreadySent.has(`${intro.id}:warm_intro_nudge_day5`)) {
          try {
            await sendNudgeAdmin({ ...baseOpts, day: 5 });
            sentCount++;
          } catch {
            errorCount++;
          }
        }
        if (!alreadySent.has(`${intro.id}:warm_intro_requester_update_day5`)) {
          try {
            await sendNudgeRequester({ ...baseOpts, day: 5 });
            sentCount++;
          } catch {
            errorCount++;
          }
        }

        // Then day 10
        if (!alreadySent.has(`${intro.id}:warm_intro_nudge_day10`)) {
          try {
            await sendNudgeAdmin({ ...baseOpts, day: 10 });
            sentCount++;
          } catch {
            errorCount++;
          }
        }
        if (!alreadySent.has(`${intro.id}:warm_intro_requester_update_day10`)) {
          try {
            await sendNudgeRequester({ ...baseOpts, day: 10 });
            sentCount++;
          } catch {
            errorCount++;
          }
        }
      }

      // Rate limit: pause every 10 emails
      if (sentCount > 0 && sentCount % 10 === 0) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    logger.info('Warm intro reminders cron completed', {
      pending: pendingIntros.length,
      sent: sentCount,
      errors: errorCount,
    });

    return res.status(200).json({
      pending: pendingIntros.length,
      sent: sentCount,
      errors: errorCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('Warm intro reminders cron error', { error: err });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
