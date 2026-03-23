import type { SearchRequest, SearchResponse, Job } from '../../shared/types.js';
import { getSupabase, getJobsTable } from '../../lib/supabase.js';
import { RATE_LIMITS } from '../../lib/rate-limit.js';
import { apiHandler } from '../../lib/api-handler.js';
import { logger } from '../../lib/logger.js';

export default apiHandler(
  { methods: ['POST'], rateLimit: RATE_LIMITS.search, name: 'jobs/search' },
  async (req, res) => {
    const body = req.body as SearchRequest;
    const sort = body.sort || 'newest';
    const page = Math.max(1, body.page || 1);
    const limit = Math.min(50, Math.max(1, body.limit || 20));
    const offset = (page - 1) * limit;

    const supabase = getSupabase();
    const table = getJobsTable();

    let query = supabase
      .from(table)
      .select(
        'id, title, company, location, country, summary, salary_range, employment_type, work_arrangement, tags, category, standout_perks, warm_intro_ok, company_logo_url, company_url, apply_url, posted_date, pinned, featured, source_type',
        { count: 'exact' },
      )
      .eq('status', 'active');

    if (body.location) {
      // Escape SQL LIKE wildcards to prevent pattern abuse / DB scan attacks
      const safeLoc = body.location.replace(/[%_\\]/g, '\\$&');
      query = query.ilike('location', `%${safeLoc}%`);
    }
    if (body.tags && body.tags.length > 0) {
      query = query.overlaps('tags', body.tags);
    }
    if (body.category) {
      query = query.eq('category', body.category);
    }

    query = query.order('pinned', { ascending: false, nullsFirst: false });
    query = query.order('featured', { ascending: false, nullsFirst: false });
    query = query.order('posted_date', { ascending: sort === 'oldest' });
    query = query.range(offset, offset + limit - 1);

    let { data, count, error } = await query;

    // Graceful fallback: if 'pinned' column doesn't exist yet, retry without it
    if (error?.code === '42703') {
      let retryQuery = supabase
        .from(table)
        .select(
          'id, title, company, location, country, summary, salary_range, employment_type, work_arrangement, tags, category, standout_perks, warm_intro_ok, company_logo_url, company_url, apply_url, posted_date, pinned, featured, source_type',
          { count: 'exact' },
        )
        .eq('status', 'active');
      if (body.location) retryQuery = retryQuery.ilike('location', `%${body.location}%`);
      if (body.tags && body.tags.length > 0) retryQuery = retryQuery.overlaps('tags', body.tags);
      if (body.category) retryQuery = retryQuery.eq('category', body.category);
      retryQuery = retryQuery.order('featured', { ascending: false, nullsFirst: false });
      retryQuery = retryQuery.order('posted_date', { ascending: sort === 'oldest' });
      retryQuery = retryQuery.range(offset, offset + limit - 1);
      ({ data, count, error } = await retryQuery);
    }

    if (error) {
      logger.error('Search query failed', {
        endpoint: 'jobs/search',
        error: error.message,
        code: error.code,
      });
      return res.status(500).json({ error: 'Search failed', code: 'SEARCH_ERROR' });
    }

    const response: SearchResponse = {
      jobs: (data || []) as unknown as Job[],
      meta: { total: count || 0, page, limit },
    };

    return res.status(200).json(response);
  },
);
