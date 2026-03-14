import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase, getJobsTable } from '../../lib/supabase.js';
import type { SearchRequest, SearchResponse, Job } from '../../shared/types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }

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
      .eq('status', 'active')
      .eq('source_type', 'direct');

    if (body.location) {
      query = query.ilike('location', `%${body.location}%`);
    }

    if (body.tags && body.tags.length > 0) {
      query = query.overlaps('tags', body.tags);
    }

    query = query.order('posted_date', { ascending: sort === 'oldest' });
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'Search failed', code: 'SEARCH_ERROR' });
    }

    const response: SearchResponse = {
      jobs: (data as Job[]) || [],
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
