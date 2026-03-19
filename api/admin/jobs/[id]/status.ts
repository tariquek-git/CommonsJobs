import { getSupabase, getJobsTable } from '../../../../lib/supabase.js';
import { sendJobApproved, notifyMatchingSubscribers } from '../../../../lib/email.js';
import { apiHandler } from '../../../../lib/api-handler.js';
import { logger } from '../../../../lib/logger.js';
import { humanizeJobPost } from '../../../../lib/ai.js';
import type { JobStatus, Job } from '../../../../shared/types.js';

const VALID_STATUSES: JobStatus[] = ['pending', 'active', 'rejected', 'archived'];

export default apiHandler(
  { methods: ['PATCH'], auth: 'admin', name: 'admin/jobs/[id]/status' },
  async (req, res) => {
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

    // Auto-generate AI summary when approving a job without one
    if (status === 'active' && !job.summary && job.description) {
      try {
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
          if (!job.location && aiResult.result.location)
            updates.location = aiResult.result.location;
          if (!job.country && aiResult.result.country) updates.country = aiResult.result.country;
          if (!job.salary_range && aiResult.result.salary_range)
            updates.salary_range = aiResult.result.salary_range;
          if (!job.employment_type && aiResult.result.employment_type)
            updates.employment_type = aiResult.result.employment_type;
          if (!job.work_arrangement && aiResult.result.work_arrangement)
            updates.work_arrangement = aiResult.result.work_arrangement;
        }
      } catch (err) {
        logger.warn('AI humanize failed, continuing without summary', { jobId: id, error: err });
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

    // When job goes live: send approval email + notify subscribers
    if (status === 'active') {
      const approvedJob = data as Job;

      // Send approval email (with dedup)
      if (approvedJob.submitter_email) {
        const { data: existingApproval } = await supabase
          .from('email_logs')
          .select('id')
          .eq('related_job_id', id)
          .eq('event_type', 'job_approved_notification')
          .eq('status', 'sent')
          .limit(1);

        if (!existingApproval?.length) {
          sendJobApproved({
            submitterName: approvedJob.submitter_name || 'there',
            submitterEmail: approvedJob.submitter_email,
            jobTitle: approvedJob.title,
            jobCompany: approvedJob.company,
            jobId: approvedJob.id,
          }).catch((err: unknown) => {
            logger.warn('Job approval email failed', { jobId: id, error: err });
          });
        }
      }

      // Notify matching subscribers (non-blocking)
      notifyMatchingSubscribers({
        id: approvedJob.id,
        title: approvedJob.title,
        company: approvedJob.company,
        location: approvedJob.location,
        category: approvedJob.category,
        tags: approvedJob.tags,
        work_arrangement: approvedJob.work_arrangement,
        salary_range: approvedJob.salary_range,
        summary: approvedJob.summary,
      }).catch((err: unknown) => {
        logger.warn('Job alert notification failed', { jobId: id, error: err });
      });
    }

    return res.status(200).json(data);
  },
);
