import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../../lib/auth.js';
import { getSupabase, getJobsTable } from '../../lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }

  if (!requireAdmin(req as unknown as Request)) {
    return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
  }

  try {
    const supabase = getSupabase();
    const statusFilter = typeof req.query.status === 'string' ? req.query.status : undefined;

    // Fetch warm intros
    let query = supabase
      .from('warm_intros')
      .select('id, name, email, linkedin, message, status, created_at, job_id');

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data: introsData, error: introsError } = await query
      .order('created_at', { ascending: false })
      .limit(200);

    if (introsError) {
      return res.status(500).json({ error: 'Failed to fetch warm intros', code: 'QUERY_ERROR' });
    }

    const intros = introsData || [];

    // Fetch related jobs for context
    const jobIds = [...new Set(intros.map((i) => i.job_id).filter(Boolean))];
    let jobMap: Record<
      string,
      {
        title: string;
        company: string;
        submitter_email: string | null;
        submitter_name: string | null;
      }
    > = {};

    if (jobIds.length > 0) {
      const { data: jobsData } = await supabase
        .from(getJobsTable())
        .select('id, title, company, submitter_email, submitter_name')
        .in('id', jobIds);

      for (const job of jobsData || []) {
        jobMap[job.id] = {
          title: job.title,
          company: job.company,
          submitter_email: job.submitter_email || null,
          submitter_name: job.submitter_name || null,
        };
      }
    }

    // Merge intro + job data
    const result = intros.map((intro) => {
      const job = jobMap[intro.job_id] || null;
      return {
        ...intro,
        job_title: job?.title || 'Unknown',
        job_company: job?.company || 'Unknown',
        job_submitter_email: job?.submitter_email || null,
        job_submitter_name: job?.submitter_name || null,
      };
    });

    return res.status(200).json({ intros: result });
  } catch {
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
}
