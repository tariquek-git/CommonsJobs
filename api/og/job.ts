import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from '../../lib/supabase.js';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Serves the SPA index.html with injected Open Graph meta tags for social sharing.
 * Vercel rewrite: /job/:id → /api/og/job?id=:id
 * Crawlers get rich previews; real users get the normal SPA experience.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return serveFallback(res);
  }

  try {
    const supabase = getSupabase();
    const { data: job } = await supabase
      .from('jobs')
      .select('id, title, company, location, country, summary, company_logo_url, warm_intro_ok')
      .eq('id', id)
      .eq('status', 'active')
      .single();

    if (!job) {
      return serveFallback(res);
    }

    const title = `${job.title} at ${job.company} | Fintech Commons`;
    const description = job.summary
      ? job.summary.slice(0, 200) + (job.summary.length > 200 ? '...' : '')
      : `${job.title} role at ${job.company}${job.location ? ` in ${job.location}` : ''}. Community-reviewed on Fintech Commons.`;
    const url = `https://fintechcommons.com/job/${job.id}`;

    const ogTags = [
      `<meta property="og:type" content="website" />`,
      `<meta property="og:title" content="${esc(title)}" />`,
      `<meta property="og:description" content="${esc(description)}" />`,
      `<meta property="og:url" content="${url}" />`,
      `<meta property="og:site_name" content="Fintech Commons" />`,
      job.company_logo_url ? `<meta property="og:image" content="${esc(job.company_logo_url)}" />` : '',
      `<meta name="twitter:card" content="summary" />`,
      `<meta name="twitter:title" content="${esc(title)}" />`,
      `<meta name="twitter:description" content="${esc(description)}" />`,
      job.company_logo_url ? `<meta name="twitter:image" content="${esc(job.company_logo_url)}" />` : '',
      `<meta name="description" content="${esc(description)}" />`,
    ].filter(Boolean).join('\n    ');

    // Read the built SPA index.html and inject OG tags
    let html = getSpaHtml();
    html = html.replace('</head>', `    ${ogTags}\n  </head>`);
    // Update the title too
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(html);
  } catch {
    return serveFallback(res);
  }
}

let cachedHtml: string | null = null;

function getSpaHtml(): string {
  if (cachedHtml) return cachedHtml;
  try {
    cachedHtml = readFileSync(join(process.cwd(), 'dist', 'index.html'), 'utf-8');
  } catch {
    // Fallback: minimal HTML shell
    cachedHtml = '<!DOCTYPE html><html><head><title>Fintech Commons</title></head><body><div id="root"></div></body></html>';
  }
  return cachedHtml;
}

function serveFallback(res: VercelResponse) {
  const html = getSpaHtml();
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
}

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
