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

    // Get all submissions with emails (leads database)
    const { data, error } = await supabase
      .from(getJobsTable())
      .select('submitter_email, company, created_at, status, title')
      .not('submitter_email', 'is', null)
      .neq('submitter_email', '')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch leads', code: 'STORAGE_ERROR' });
    }

    const leads = (data || []).map((row) => ({
      email: row.submitter_email,
      company: row.company,
      title: row.title,
      status: row.status,
      submitted_at: row.created_at,
    }));

    return res.status(200).json({ leads });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
}
