import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from '../../lib/supabase.js';
import { readFileSync } from 'fs';
import { join } from 'path';

const BOT_PATTERN =
  /bot|crawl|spider|slurp|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|WhatsApp|Discordbot|Googlebot|bingbot|yandex|baidu|duckduckbot|Applebot|Pinterestbot|TelegramBot/i;

/**
 * Serves the SPA index.html with injected Open Graph meta tags for social sharing.
 * Vercel rewrite: /job/:id → /api/og/job?id=:id
 * Only queries DB for bot/crawler user-agents to save serverless invocation costs.
 * Real users get the static SPA shell immediately (React hydrates the job data client-side).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  const ua = req.headers['user-agent'] || '';

  // Real users: serve cached static SPA — skip DB query entirely
  if (!BOT_PATTERN.test(ua)) {
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=86400');
    return serveFallback(res);
  }

  if (!id || typeof id !== 'string') {
    return serveFallback(res);
  }

  try {
    const supabase = getSupabase();
    const { data: job } = await supabase
      .from('jobs')
      .select('id, title, company, location, country, summary, company_logo_url, company_url, warm_intro_ok, apply_url, employment_type, work_arrangement, salary_range, posted_date, description')
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

    // Build JSON-LD for crawlers
    const jsonLd: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'JobPosting',
      title: job.title,
      description: job.description || job.summary || `${job.title} at ${job.company}`,
      datePosted: job.posted_date,
      hiringOrganization: { '@type': 'Organization', name: job.company, ...(job.company_url ? { sameAs: job.company_url } : {}), ...(job.company_logo_url ? { logo: job.company_logo_url } : {}) },
      ...(job.location ? { jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: job.location, ...(job.country ? { addressCountry: job.country } : {}) } } } : {}),
      ...(job.apply_url ? { url: job.apply_url, directApply: true } : {}),
    };
    if (job.employment_type) {
      const typeMap: Record<string, string> = { 'Full-time': 'FULL_TIME', 'Part-time': 'PART_TIME', 'Contract': 'CONTRACTOR', 'Internship': 'INTERN' };
      jsonLd.employmentType = typeMap[job.employment_type] || job.employment_type;
    }
    if (job.work_arrangement?.toLowerCase().includes('remote')) jsonLd.jobLocationType = 'TELECOMMUTE';

    const jsonLdTag = `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;

    // Read the built SPA index.html and inject OG tags + JSON-LD
    let html = getSpaHtml();
    html = html.replace('</head>', `    ${ogTags}\n    ${jsonLdTag}\n  </head>`);
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
