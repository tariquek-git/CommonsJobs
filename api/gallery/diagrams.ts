import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS — public endpoint
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return res.status(503).json({ error: 'Gallery not configured' });

  const client = createClient(url, key);

  const { data, error } = await client
    .from('diagrams')
    .select('id, title, node_count, created_at, updated_at')
    .eq('is_public', true)
    .order('updated_at', { ascending: false })
    .limit(48);

  if (error) {
    console.error('[gallery/diagrams]', error.message);
    return res.status(500).json({ error: 'Failed to load gallery' });
  }

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  return res.status(200).json({ diagrams: data ?? [] });
}
