import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase, getJobsTable } from '../../lib/supabase.js';
import type { SearchRequest, SearchResponse, AggregatedPolicy, Job } from '../../shared/types.js';

const WEB_PULSE_POLICY: AggregatedPolicy = {
  country: 'Canada',
  maxAgeDays: 12,
  maxResults: 50,
  maxPerCompany: 5,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const body = req.body as SearchRequest;
    const feed = body.feed || 'community';
    const sort = body.sort || 'newest';
    const page = Math.max(1, body.page || 1);
    const limit = Math.min(50, Math.max(1, body.limit || 20));
    const offset = (page - 1) * limit;

    const supabase = getSupabase();
    const table = getJobsTable();

    if (feed === 'community') {
      // Community feed: direct sources, active only
      let query = supabase
        .from(table)
        .select('*', { count: 'exact' })
        .eq('status', 'active')
        .eq('source_type', 'direct');

      if (body.location) {
        query = query.ilike('location', `%${body.location}%`);
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
          aggregatedPolicyApplied: false,
        },
      };

      return res.status(200).json(response);
    }

    // Web Pulse feed: aggregated sources with policy constraints
    const policyDate = new Date();
    policyDate.setDate(policyDate.getDate() - WEB_PULSE_POLICY.maxAgeDays);

    // Fetch all matching aggregated jobs (before policy limits)
    const { data: allJobs, error: fetchError } = await supabase
      .from(table)
      .select('*')
      .eq('status', 'active')
      .eq('source_type', 'aggregated')
      .ilike('country', `%${WEB_PULSE_POLICY.country}%`)
      .gte('posted_date', policyDate.toISOString())
      .order('posted_date', { ascending: sort === 'oldest' });

    if (fetchError) {
      return res.status(500).json({ error: 'Search failed', code: 'SEARCH_ERROR' });
    }

    const beforePolicy = allJobs?.length || 0;

    // Apply max-per-company policy
    const companyCounts = new Map<string, number>();
    const filtered: Job[] = [];

    for (const job of (allJobs as Job[]) || []) {
      const companyKey = job.company.toLowerCase().trim();
      const count = companyCounts.get(companyKey) || 0;
      if (count >= WEB_PULSE_POLICY.maxPerCompany) continue;
      companyCounts.set(companyKey, count + 1);
      filtered.push(job);
      if (filtered.length >= WEB_PULSE_POLICY.maxResults) break;
    }

    const afterPolicy = filtered.length;

    // Paginate the filtered results
    const pageJobs = filtered.slice(offset, offset + limit);

    const response: SearchResponse = {
      jobs: pageJobs,
      meta: {
        total: afterPolicy,
        page,
        limit,
        aggregatedPolicyApplied: true,
        aggregatedCounts: {
          beforePolicy,
          afterPolicy,
        },
        policy: WEB_PULSE_POLICY,
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
