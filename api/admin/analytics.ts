import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../../lib/auth.js';
import { getSupabase, getJobsTable, getClicksTable } from '../../lib/supabase.js';
import { getClientIP, rateLimitOrReject, RATE_LIMITS } from '../../lib/rate-limit.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }

  if (!requireAdmin(req as unknown as Request)) {
    return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
  }

  const ip = getClientIP(req as unknown as Request);
  if (rateLimitOrReject(ip, RATE_LIMITS.adminRead, res)) return;

  try {
    const supabase = getSupabase();

    // Get clicks with job info (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [
      clicksResult,
      warmIntrosResult,
      jobsByStatusResult,
      allIntrosResult,
      recentEmailsResult,
    ] = await Promise.all([
      // Clicks in last 30 days (single query for both daily counts and top jobs)
      supabase
        .from(getClicksTable())
        .select('created_at, job_id')
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: true }),

      // Warm intros in last 30 days
      supabase
        .from('warm_intros')
        .select('created_at')
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: true }),

      // Jobs by status
      supabase.from(getJobsTable()).select('status'),

      // All warm intros for pipeline summary
      supabase.from('warm_intros').select('status, contact_response').limit(500),

      // Recent email activity
      supabase
        .from('email_logs')
        .select(
          'event_type, recipient, subject, status, created_at, related_job_id, related_warm_intro_id',
        )
        .order('created_at', { ascending: false })
        .limit(15),
    ]);

    const clicksData = clicksResult.data || [];

    // Aggregate clicks by day
    const clicksByDay = aggregateByDay(clicksData.map((r) => r.created_at));
    const introsByDay = aggregateByDay(warmIntrosResult.data?.map((r) => r.created_at) || []);

    // Count clicks per job (reuse the same query result)
    const jobClickCounts: Record<string, number> = {};
    for (const click of clicksData) {
      jobClickCounts[click.job_id] = (jobClickCounts[click.job_id] || 0) + 1;
    }

    // Get top 10 job IDs
    const topJobIds = Object.entries(jobClickCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => id);

    // Fetch job details for top jobs
    let topJobs: { id: string; title: string; company: string; clicks: number }[] = [];
    if (topJobIds.length > 0) {
      const { data: jobsData } = await supabase
        .from(getJobsTable())
        .select('id, title, company')
        .in('id', topJobIds);

      topJobs = (jobsData || [])
        .map((j) => ({
          id: j.id,
          title: j.title,
          company: j.company,
          clicks: jobClickCounts[j.id] || 0,
        }))
        .sort((a, b) => b.clicks - a.clicks);
    }

    // Status breakdown
    const statusCounts: Record<string, number> = {};
    for (const job of jobsByStatusResult.data || []) {
      statusCounts[job.status] = (statusCounts[job.status] || 0) + 1;
    }

    // Warm intro pipeline summary
    const introPipeline: Record<string, number> = {
      pending: 0,
      contacted: 0,
      accepted: 0,
      connected: 0,
      followed_up: 0,
      declined: 0,
      no_response: 0,
    };
    const contactResponses: Record<string, number> = {
      accepted: 0,
      declined: 0,
      more_info: 0,
    };
    const allIntros = allIntrosResult.data || [];
    for (const intro of allIntros) {
      if (intro.status in introPipeline) introPipeline[intro.status]++;
      else introPipeline[intro.status] = 1;
      if (intro.contact_response && intro.contact_response in contactResponses) {
        contactResponses[intro.contact_response]++;
      }
    }
    const totalIntros = allIntros.length;
    const connectionRate =
      totalIntros > 0 ? Math.round((introPipeline.connected / totalIntros) * 100) : 0;

    // Recent email activity feed
    const recentEmails = (recentEmailsResult.data || []).map((e) => ({
      event_type: e.event_type,
      recipient: e.recipient,
      subject: e.subject,
      status: e.status,
      created_at: e.created_at,
      job_id: e.related_job_id,
      intro_id: e.related_warm_intro_id,
    }));

    return res.status(200).json({
      clicksByDay,
      introsByDay,
      topJobs,
      statusCounts,
      totals: {
        clicks30d: clicksData.length,
        intros30d: warmIntrosResult.data?.length || 0,
      },
      introPipeline: {
        ...introPipeline,
        total: totalIntros,
        connectionRate,
        contactResponses,
      },
      recentEmails,
    });
  } catch (err) {
    const { logger } = await import('../../lib/logger.js');
    logger.error('Analytics aggregation error', { endpoint: 'admin/analytics', error: err });
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
}

function aggregateByDay(timestamps: string[]): { date: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const ts of timestamps) {
    const day = ts.slice(0, 10); // YYYY-MM-DD
    counts[day] = (counts[day] || 0) + 1;
  }

  // Fill in missing days in the range
  const result: { date: string; count: number }[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, count: counts[key] || 0 });
  }
  return result;
}
