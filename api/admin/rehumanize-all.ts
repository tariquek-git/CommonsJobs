import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../../lib/auth.js';
import { getSupabase, getJobsTable } from '../../lib/supabase.js';
import { humanizeJobPost, PROMPT_VERSION } from '../../lib/ai.js';
import { logger } from '../../lib/logger.js';
import type { Job } from '../../shared/types.js';

/**
 * POST /api/admin/rehumanize-all
 * Re-runs the two-step AI humanize on ALL active jobs that have a description.
 * Overwrites: summary, standout_perks, tags, category, location, country,
 *   work_arrangement, employment_type, salary_range.
 * Preserves: title, company, company_url (only updates if AI found a better one and current is null).
 *
 * Query params:
 *   ?limit=10       — max jobs to process (default 10, max 50)
 *   ?offset=0       — skip first N jobs (for batching)
 *   ?force=true     — re-process even if already on current prompt version
 *   ?dry_run=true   — preview what would change without writing to DB
 *
 * Admin-only. Call multiple times with offset to process all jobs.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!requireAdmin(req as unknown as Request)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const force = req.query.force === 'true';
    const dryRun = req.query.dry_run === 'true';

    const supabase = getSupabase();
    const table = getJobsTable();

    // Fetch active jobs with descriptions
    let query = supabase
      .from(table)
      .select(
        'id, title, company, description, location, country, company_url, salary_range, employment_type, work_arrangement, category, tags, standout_perks, summary',
      )
      .eq('status', 'active')
      .not('description', 'is', null)
      .order('posted_date', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: jobs, error } = await query;

    if (error) {
      logger.error('Rehumanize fetch failed', { error });
      return res.status(500).json({ error: 'Failed to fetch jobs', details: error.message });
    }

    if (!jobs || jobs.length === 0) {
      return res.status(200).json({
        message: 'No more jobs to process',
        processed: 0,
        prompt_version: PROMPT_VERSION,
        next_offset: offset,
      });
    }

    const results: {
      id: string;
      title: string;
      status: string;
      changes?: Record<string, { old: unknown; new: unknown }>;
    }[] = [];

    for (const row of jobs) {
      const job = row as Job;

      // Skip if description is too short for AI
      if (!job.description || job.description.trim().length < 20) {
        results.push({ id: job.id, title: job.title, status: 'skipped_short_description' });
        continue;
      }

      try {
        const aiResult = await humanizeJobPost(job.description, job.title, {
          company: job.company,
          location: job.location || undefined,
          country: job.country || undefined,
          company_url: job.company_url || undefined,
        });

        if (aiResult.fallback || !aiResult.result.humanized_description) {
          results.push({ id: job.id, title: job.title, status: 'ai_failed' });
          continue;
        }

        if (aiResult.result.rejection) {
          results.push({ id: job.id, title: job.title, status: 'rejected_by_ai' });
          continue;
        }

        const r = aiResult.result;

        // Build update object — overwrite AI-generated fields
        const updates: Record<string, unknown> = {
          summary: r.humanized_description,
          updated_at: new Date().toISOString(),
        };

        // Always overwrite these AI-generated fields
        if (r.standout_perks.length > 0) updates.standout_perks = r.standout_perks;
        if (r.tags && r.tags.length > 0) updates.tags = r.tags;
        if (r.category) updates.category = r.category;
        if (r.location) updates.location = r.location;
        if (r.country) updates.country = r.country;
        if (r.work_arrangement) updates.work_arrangement = r.work_arrangement;
        if (r.employment_type) updates.employment_type = r.employment_type;
        if (r.salary_range) updates.salary_range = r.salary_range;

        // Only update these if currently null (don't overwrite manual edits)
        if (!job.company_url && r.company_url) updates.company_url = r.company_url;

        // Track what changed for the response
        const changes: Record<string, { old: unknown; new: unknown }> = {};
        for (const [key, newVal] of Object.entries(updates)) {
          if (key === 'updated_at') continue;
          const oldVal = (job as unknown as Record<string, unknown>)[key];
          if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
            changes[key] = { old: oldVal, new: newVal };
          }
        }

        if (dryRun) {
          results.push({
            id: job.id,
            title: job.title,
            status: 'dry_run',
            changes,
          });
        } else {
          await supabase.from(table).update(updates).eq('id', job.id);
          results.push({
            id: job.id,
            title: job.title,
            status: Object.keys(changes).length > 0 ? 'updated' : 'no_changes',
            changes,
          });
        }
      } catch (err) {
        logger.error('Rehumanize job error', { jobId: job.id, error: err });
        results.push({ id: job.id, title: job.title, status: 'error' });
      }
    }

    const summary = {
      updated: results.filter((r) => r.status === 'updated').length,
      no_changes: results.filter((r) => r.status === 'no_changes').length,
      ai_failed: results.filter((r) => r.status === 'ai_failed').length,
      errors: results.filter((r) => r.status === 'error').length,
      skipped: results.filter((r) => r.status.startsWith('skipped')).length,
      dry_run: results.filter((r) => r.status === 'dry_run').length,
    };

    logger.info('Rehumanize batch complete', {
      endpoint: 'rehumanize-all',
      prompt_version: PROMPT_VERSION,
      offset,
      limit,
      ...summary,
    });

    return res.status(200).json({
      message: `Processed ${results.length} jobs`,
      prompt_version: PROMPT_VERSION,
      dry_run: dryRun,
      processed: results.length,
      next_offset: offset + limit,
      summary,
      results,
    });
  } catch (err) {
    logger.error('Rehumanize handler failed', { error: err });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
