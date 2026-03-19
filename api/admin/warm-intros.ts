import { getSupabase, getJobsTable } from '../../lib/supabase.js';
import { logger } from '../../lib/logger.js';
import { apiHandler } from '../../lib/api-handler.js';

export default apiHandler(
  { methods: ['GET'], auth: 'admin', name: 'admin/warm-intros' },
  async (req, res) => {
    const supabase = getSupabase();
    const statusFilter = typeof req.query.status === 'string' ? req.query.status : undefined;

    // Support counts_only mode for dashboard summary
    if (req.query.counts_only === 'true') {
      const { data: allIntros } = await supabase
        .from('warm_intros')
        .select('id, status, created_at, status_updated_at')
        .order('created_at', { ascending: false })
        .limit(200);

      const intros = allIntros || [];
      const now = Date.now();
      const counts: Record<string, number> = {
        pending: 0,
        contacted: 0,
        accepted: 0,
        connected: 0,
        followed_up: 0,
        declined: 0,
        no_response: 0,
      };
      const stale: { id: string; status: string; days: number }[] = [];

      for (const i of intros) {
        if (i.status in counts) counts[i.status]++;
        else counts[i.status] = 1;
        const updatedAt = new Date(i.status_updated_at || i.created_at).getTime();
        const days = Math.floor((now - updatedAt) / 86400000);
        if (
          (i.status === 'pending' && days >= 5) ||
          (i.status === 'contacted' && days >= 5) ||
          (i.status === 'accepted' && days >= 2)
        ) {
          stale.push({ id: i.id, status: i.status, days });
        }
      }

      return res.status(200).json({ counts, stale, total: intros.length });
    }

    // Full fetch with enriched data
    let query = supabase
      .from('warm_intros')
      .select(
        'id, name, email, linkedin, message, status, created_at, status_updated_at, job_id, referrer_name, referrer_company',
      );

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data: introsData, error: introsError } = await query
      .order('created_at', { ascending: false })
      .limit(200);

    if (introsError) {
      logger.error('Warm intros query failed', { error: introsError });
      return res.status(500).json({
        error: 'Failed to fetch warm intros',
        code: 'QUERY_ERROR',
      });
    }

    const intros = introsData || [];

    // Fetch related jobs for context
    const jobIds = [...new Set(intros.map((i) => i.job_id).filter(Boolean))];
    const jobMap: Record<
      string,
      {
        title: string;
        company: string;
        status: string;
        apply_url: string | null;
        submitter_email: string | null;
        submitter_name: string | null;
      }
    > = {};

    if (jobIds.length > 0) {
      const { data: jobsData } = await supabase
        .from(getJobsTable())
        .select('id, title, company, status, apply_url, submitter_email, submitter_name')
        .in('id', jobIds);

      for (const job of jobsData || []) {
        jobMap[job.id] = {
          title: job.title,
          company: job.company,
          status: job.status,
          apply_url: job.apply_url || null,
          submitter_email: job.submitter_email || null,
          submitter_name: job.submitter_name || null,
        };
      }
    }

    // Fetch email counts per intro
    const introIds = intros.map((i) => i.id);
    const emailMap: Record<string, { count: number; last_at: string | null; types: string[] }> = {};

    if (introIds.length > 0) {
      const { data: emailLogs } = await supabase
        .from('email_logs')
        .select('related_warm_intro_id, event_type, created_at')
        .in('related_warm_intro_id', introIds)
        .eq('status', 'sent')
        .order('created_at', { ascending: false });

      for (const log of emailLogs || []) {
        const id = log.related_warm_intro_id;
        if (!id) continue;
        if (!emailMap[id]) {
          emailMap[id] = { count: 0, last_at: null, types: [] };
        }
        emailMap[id].count++;
        if (!emailMap[id].last_at) emailMap[id].last_at = log.created_at;
        if (!emailMap[id].types.includes(log.event_type)) {
          emailMap[id].types.push(log.event_type);
        }
      }
    }

    // Merge intro + job + email data
    const now = Date.now();
    const result = intros.map((intro) => {
      const job = jobMap[intro.job_id] || null;
      const emails = emailMap[intro.id] || { count: 0, last_at: null, types: [] };
      const updatedAt = new Date(intro.status_updated_at || intro.created_at).getTime();
      const daysInStatus = Math.floor((now - updatedAt) / 86400000);

      return {
        ...intro,
        job_title: job?.title || 'Unknown',
        job_company: job?.company || 'Unknown',
        job_status: job?.status || 'unknown',
        job_apply_url: job?.apply_url || null,
        job_submitter_email: job?.submitter_email || null,
        job_submitter_name: job?.submitter_name || null,
        email_count: emails.count,
        last_email_at: emails.last_at,
        email_types: emails.types,
        days_in_status: daysInStatus,
        is_stale:
          (intro.status === 'pending' && daysInStatus >= 5) ||
          (intro.status === 'contacted' && daysInStatus >= 5) ||
          (intro.status === 'accepted' && daysInStatus >= 2),
        needs_reminder:
          (intro.status === 'pending' && daysInStatus >= 10) ||
          (intro.status === 'contacted' && daysInStatus >= 10) ||
          (intro.status === 'accepted' && daysInStatus >= 3),
      };
    });

    return res.status(200).json({ intros: result });
  },
);
