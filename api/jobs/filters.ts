import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase, getJobsTable } from '../../lib/supabase.js';
import { getClientIP, rateLimitOrReject, RATE_LIMITS } from '../../lib/rate-limit.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIP(req as unknown as Request);
  if (rateLimitOrReject(ip, RATE_LIMITS.search, res)) return;

  try {
    const supabase = getSupabase();
    const table = getJobsTable();

    // Fetch all active jobs' category and tags
    const { data, error } = await supabase
      .from(table)
      .select('category, tags')
      .eq('status', 'active');

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch filters' });
    }

    // Count categories
    const catCounts = new Map<string, number>();
    const tagCounts = new Map<string, number>();

    for (const row of data || []) {
      if (row.category) {
        catCounts.set(row.category, (catCounts.get(row.category) || 0) + 1);
      }
      if (Array.isArray(row.tags)) {
        for (const tag of row.tags) {
          if (tag) {
            const normalized = tag.toLowerCase().trim();
            tagCounts.set(normalized, (tagCounts.get(normalized) || 0) + 1);
          }
        }
      }
    }

    // Sort by count desc
    const categories = Array.from(catCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Only return tags that appear on 2+ jobs (or all if fewer than 10 unique tags)
    const allTags = Array.from(tagCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const tags =
      allTags.length > 10 ? allTags.filter((t) => t.count >= 2).slice(0, 20) : allTags.slice(0, 20);

    // CDN cache: 10min server, serve stale up to 30min while revalidating
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');

    return res.status(200).json({ categories, tags });
  } catch {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
