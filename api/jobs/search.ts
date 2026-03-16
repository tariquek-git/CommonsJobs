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
      .select('*', { count: 'exact' })
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

    // Featured jobs always appear first, then sort by date
    query = query.order('featured', { ascending: false, nullsFirst: false });
    query = query.order('posted_date', { ascending: sort === 'oldest' });
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'Search failed', code: 'SEARCH_ERROR' });
    }

    // Strip sensitive PII and internal fields before responding
    const PII_FIELDS = ['submitter_name', 'submitter_email', 'submitter_ip_hash', 'submitter_user_agent', 'submitter_referrer', 'ai_summary', 'tags_text'];
    const sanitizedJobs = ((data || []) as Record<string, unknown>[]).map((row) => {
      const clean = { ...row };
      for (const key of PII_FIELDS) delete clean[key];
      return clean;
    });

    const response: SearchResponse = {
      jobs: sanitizedJobs as unknown as Job[],
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
