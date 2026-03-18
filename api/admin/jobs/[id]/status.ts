import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../../../../lib/auth.js';
import { getSupabase, getJobsTable } from '../../../../lib/supabase.js';
import { sendJobApproved } from '../../../../lib/email.js';
import { humanizeJobPost } from '../../../../lib/ai.js';
import type { JobStatus, Job } from '../../../../shared/types.js';

const VALID_STATUSES: JobStatus[] = ['pending', 'active', 'rejected', 'archived'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }

  if (!requireAdmin(req as unknown as Request)) {
    return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
  }

  try {
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Job ID required', code: 'BAD_REQUEST' });
    }

    const { status } = req.body as { status: JobStatus };
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Status must be one of: ${VALID_STATUSES.join(', ')}`,
        code: 'BAD_REQUEST',
      });
    }

    const supabase = getSupabase();

    // Fetch current job data first
    const { data: currentJob, error: fetchError } = await supabase
      .from(getJobsTable())
      .select()
      .eq('id', id)
      .single();

    if (fetchError || !currentJob) {
      return res.status(404).json({ error: 'Job not found', code: 'NOT_FOUND' });
    }

    const job = currentJob as Job;
    const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };

    // Auto-generate AI summary when approving a job that has no summary
    if (status === 'active' && !job.summary && job.description) {
      const aiResult = await humanizeJobPost(job.description, job.title, {
        company: job.company,
        location: job.location || undefined,
        country: job.country || undefined,
        company_url: job.company_url || undefined,
      });

      if (!aiResult.fallback && aiResult.result.humanized_description) {
        updates.summary = aiResult.result.humanized_description;
        if (aiResult.result.standout_perks?.length) {
          updates.standout_perks = aiResult.result.standout_perks;
        }
        // Fill in any missing metadata from AI
        if (!job.location && aiResult.result.location) updates.location = aiResult.result.location;
        if (!job.country && aiResult.result.country) updates.country = aiResult.result.country;
        if (!job.salary_range && aiResult.result.salary_range)
          updates.salary_range = aiResult.result.salary_range;
        if (!job.employment_type && aiResult.result.employment_type)
          updates.employment_type = aiResult.result.employment_type;
        if (!job.work_arrangement && aiResult.result.work_arrangement)
          updates.work_arrangement = aiResult.result.work_arrangement;
      }
    }

    const { data, error } = await supabase
      .from(getJobsTable())
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update status', code: 'STORAGE_ERROR' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Job not found', code: 'NOT_FOUND' });
    }

    // Send approval email when job goes live (with duplicate check)
    if (status === 'active' && (data as Job).submitter_email) {
      const j = data as Job;

      // Prevent duplicate approval emails
      const { data: existingApproval } = await supabase
        .from('email_logs')
        .select('id')
        .eq('related_job_id', id)
        .eq('event_type', 'job_approved_notification')
        .eq('status', 'sent')
        .limit(1);

      if (!existingApproval?.length) {
        sendJobApproved({
          submitterName: j.submitter_name || 'there',
          submitterEmail: j.submitter_email!,
          jobTitle: j.title,
          jobCompany: j.company,
          jobId: j.id,
        }).catch(() => {});
      }
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
}
