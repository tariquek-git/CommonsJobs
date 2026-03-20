import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../../../../lib/auth.js';
import { getSupabase, getJobsTable } from '../../../../lib/supabase.js';
import { sendIntroFollowUp } from '../../../../lib/email.js';

/**
 * POST /api/admin/warm-intros/[id]/follow-up
 *
 * Sends a "How did it go?" follow-up email to the intro requester.
 * Only works for intros with status "connected".
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!requireAdmin(req as unknown as Request)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const id = req.query.id as string;
  if (!id) {
    return res.status(400).json({ error: 'Missing intro ID' });
  }

  try {
    const supabase = getSupabase();

    // Fetch intro
    const { data: intro, error: introError } = await supabase
      .from('warm_intros')
      .select('id, name, email, job_id, status')
      .eq('id', id)
      .single();

    if (introError || !intro) {
      return res.status(404).json({ error: 'Intro not found' });
    }

    if (intro.status !== 'connected') {
      return res.status(400).json({ error: 'Follow-up only available for connected intros' });
    }

    // Check if follow-up was already sent (dedup)
    const { data: existingLogs } = await supabase
      .from('email_logs')
      .select('id')
      .eq('related_warm_intro_id', id)
      .eq('event_type', 'warm_intro_follow_up')
      .eq('status', 'sent')
      .limit(1);

    if (existingLogs && existingLogs.length > 0) {
      return res.status(200).json({
        success: true,
        message: 'Follow-up was already sent',
        already_sent: true,
      });
    }

    // Fetch job details
    const { data: job } = await supabase
      .from(getJobsTable())
      .select('id, title, company, submitter_name')
      .eq('id', intro.job_id)
      .single();

    const sent = await sendIntroFollowUp({
      requesterName: intro.name,
      requesterEmail: intro.email,
      contactName: job?.submitter_name || 'the team',
      jobTitle: job?.title || 'the role',
      jobCompany: job?.company || 'the company',
      jobId: intro.job_id,
      introId: intro.id,
    });

    if (!sent) {
      return res.status(502).json({ error: 'Failed to send follow-up email' });
    }

    return res.status(200).json({ success: true, message: 'Follow-up email sent' });
  } catch {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
