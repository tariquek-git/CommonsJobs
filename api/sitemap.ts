import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase, getJobsTable } from '../lib/supabase.js';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const supabase = getSupabase();
    const { data: jobs } = await supabase
      .from(getJobsTable())
      .select('id, posted_date')
      .eq('status', 'active')
      .order('posted_date', { ascending: false })
      .limit(1000);

    const baseUrl = 'https://www.fintechcommons.com';

    const urls = [
      `<url><loc>${baseUrl}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
      `<url><loc>${baseUrl}/submit</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>`,
      ...(jobs || []).map(
        (job) =>
          `<url><loc>${baseUrl}/job/${job.id}</loc><lastmod>${new Date(job.posted_date).toISOString().split('T')[0]}</lastmod><priority>0.8</priority></url>`,
      ),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(xml);
  } catch {
    return res
      .status(500)
      .send(
        '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
      );
  }
}
