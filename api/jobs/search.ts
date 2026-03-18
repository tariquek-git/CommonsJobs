import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase, getJobsTable } from '../../lib/supabase.js';
import type { SearchRequest, SearchResponse, Job } from '../../shared/types.js';
import { getClientIP, rateLimitOrReject, RATE_LIMITS } from '../../lib/rate-limit.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }

  const ip = getClientIP(req);
  if (rateLimitOrReject(ip, RATE_LIMITS.search, res)) return;

  try {
    const body = req.body as SearchRequest;
    const sort = body.sort || 'newest';
    const page = Math.max(1, body.page || 1);
    const limit = Math.min(50, Math.max(1, body.limit || 20));
    const offset = (page - 1) * limit;

    const supabase = getSupabase();
    const table = getJobsTable();

    // Community feed: direct sources, active only
    let query = supabase
      .from(table)
      .select(
        'id, title, company, location, country, summary, salary_range, employment_type, work_arrangement, tags, category, standout_perks, warm_intro_ok, company_logo_url, company_url, apply_url, posted_date, pinned, featured, source_type',
        { count: 'exact' },
      )
      .eq('status', 'active');

    if (body.location) {
      query = query.ilike('location', `%${body.location}%`);
    }

    if (body.tags && body.tags.length > 0) {
      query = query.overlaps('tags', body.tags);
    }

    if (body.category) {
      query = query.eq('category', body.category);
    }

    // Pinned jobs first, then featured, then sort by date
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
      return res.status(500).json({ error: 'Search failed', code: 'SEARCH_ERROR' });
    }

    const response: SearchResponse = {
      jobs: (data || []) as unknown as Job[],
      meta: {
        total: count || 0,
        page,
        limit,
      },
    };

    return res.status(200).json(response);
  } catch (err) {
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
}
