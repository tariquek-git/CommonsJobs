import type { VercelRequest, VercelResponse } from '@vercel/node';
import { scrapeAndExtract } from '../../lib/ai.js';
import { getClientIP, rateLimitOrReject, RATE_LIMITS } from '../../lib/rate-limit.js';
import { logger } from '../../lib/logger.js';

// ── Realistic browser headers to avoid bot detection ──
const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
  'Sec-Ch-Ua': '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"macOS"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

// Known job board API patterns — fetch structured data directly when possible
interface JobBoardApi {
  apiUrl: string;
  board: 'greenhouse' | 'ashby';
}

function getJobBoardApi(url: string): JobBoardApi | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;

    // Greenhouse: board page → JSON API
    const ghMatch = url.match(/boards\.greenhouse\.io\/([^/]+)\/jobs\/(\d+)/);
    if (ghMatch) {
      return {
        apiUrl: `https://boards-api.greenhouse.io/v1/boards/${ghMatch[1]}/jobs/${ghMatch[2]}`,
        board: 'greenhouse',
      };
    }

    // Lever: embeds JSON-LD; regular fetch with good headers usually works
    if (host === 'jobs.lever.co') return null;

    // Ashby: job page → API
    const ashbyMatch = url.match(/jobs\.ashbyhq\.com\/([^/]+)\/([a-f0-9-]+)/);
    if (ashbyMatch) {
      return {
        apiUrl: `https://api.ashbyhq.com/posting-api/job-board/${ashbyMatch[1]}/posting/${ashbyMatch[2]}`,
        board: 'ashby',
      };
    }

    return null;
  } catch {
    return null;
  }
}

// Parse structured JSON from known job board APIs directly (no AI needed)
function stripHtml(html: string): string {
  return html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseGreenhouseJob(json: Record<string, unknown>): Record<string, string | null> {
  const loc = json.location as Record<string, unknown> | undefined;
  const content = (json.content as string) || '';
  const description = stripHtml(content);
  const locationStr = loc?.name as string | undefined;

  return {
    title: (json.title as string) || null,
    company: (json.company_name as string) || null,
    description: description || null,
    location: locationStr || null,
    country: null,
    company_url: null,
    salary_range: null,
    employment_type: null,
    work_arrangement: locationStr?.toLowerCase().includes('remote') ? 'Remote' : null,
  };
}

function parseAshbyJob(json: Record<string, unknown>): Record<string, string | null> {
  const info = json.info as Record<string, unknown> | undefined;
  const descHtml = (info?.descriptionHtml as string) || (json.descriptionHtml as string) || '';
  const description = stripHtml(descHtml);
  const locationStr = (json.locationName as string) || (info?.location as string) || null;

  return {
    title: (json.title as string) || (info?.title as string) || null,
    company: (json.organizationName as string) || null,
    description: description || null,
    location: locationStr,
    country: null,
    company_url: null,
    salary_range: (json.compensationTierSummary as string) || null,
    employment_type: (json.employmentType as string) || null,
    work_arrangement: locationStr?.toLowerCase().includes('remote') ? 'Remote' : null,
  };
}

// Fetch with realistic browser behavior
async function fetchWithBrowserHeaders(
  url: string,
  timeoutMs = 12000,
): Promise<{ html: string; ok: boolean; status: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: BROWSER_HEADERS,
      redirect: 'follow',
    });
    clearTimeout(timer);
    if (!response.ok) {
      return { html: '', ok: false, status: response.status };
    }
    const html = await response.text();
    return { html, ok: true, status: response.status };
  } catch (err) {
    clearTimeout(timer);
    return { html: '', ok: false, status: 0 };
  }
}

// Check if the HTML looks like a real page with job content (not a bot block or empty shell)
function hasUsableContent(html: string): boolean {
  if (html.length < 500) return false;
  // Check for common signs of bot-blocked pages
  const lower = html.toLowerCase();
  if (lower.includes('captcha') && !lower.includes('job')) return false;
  if (lower.includes('please verify you are a human') && html.length < 3000) return false;
  if (lower.includes('access denied') && html.length < 2000) return false;
  // Check for minimum real content (not just a JS shell)
  const textContent = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
  return textContent.length > 200;
}

// Block requests to private/internal IP ranges (SSRF protection)
function isPrivateHostname(hostname: string): boolean {
  // Block localhost variants
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '0.0.0.0'
  ) {
    return true;
  }
  // Block IPv6-mapped IPv4 (e.g. ::ffff:127.0.0.1)
  if (hostname.startsWith('::ffff:')) {
    return isPrivateHostname(hostname.slice(7));
  }
  // Block all IPv6 literals (conservative — safe for a job board)
  if (hostname.includes(':')) {
    return true;
  }
  // Block common private/internal ranges
  const parts = hostname.split('.');
  if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p))) {
    const [a, b] = parts.map(Number);
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 (link-local / cloud metadata)
    if (a === 0) return true; // 0.0.0.0/8
  }
  // Block metadata endpoints
  if (hostname === 'metadata.google.internal' || hostname === 'metadata.google.com') {
    return true;
  }
  return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }

  const ip = getClientIP(req);
  if (rateLimitOrReject(ip, RATE_LIMITS.aiScrape, res)) return;

  try {
    const { url } = req.body as { url: string };

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required', code: 'BAD_REQUEST' });
    }

    // Validate URL format
    let parsed: URL;
    try {
      parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return res.status(400).json({ error: 'URL must use HTTP or HTTPS', code: 'BAD_REQUEST' });
      }
    } catch {
      return res.status(400).json({ error: 'Invalid URL format', code: 'BAD_REQUEST' });
    }

    // SSRF protection: block private/internal hostnames
    if (isPrivateHostname(parsed.hostname)) {
      return res.status(400).json({ error: 'URL not allowed', code: 'BAD_REQUEST' });
    }

    // Strategy 1: Try known job board APIs first (structured JSON, no anti-bot, no AI needed)
    const boardApi = getJobBoardApi(url);
    if (boardApi) {
      try {
        const apiResult = await fetchWithBrowserHeaders(boardApi.apiUrl, 10000);
        if (apiResult.ok && apiResult.html.length > 100) {
          try {
            const json = JSON.parse(apiResult.html);
            const parsed =
              boardApi.board === 'greenhouse' ? parseGreenhouseJob(json) : parseAshbyJob(json);

            // If we got a title and description, return directly (skip AI)
            if (parsed.title && parsed.description) {
              logger.info('Parsed directly from job board API', {
                endpoint: 'scrape-url',
                url,
                board: boardApi.board,
              });
              return res.status(200).json({ result: parsed, fallback: false });
            }
          } catch {
            // JSON parse failed — fall through to AI extraction
          }

          // Fallback: send raw API response to AI extractor
          logger.info('Job board API → AI extraction', { endpoint: 'scrape-url', url });
          const result = await scrapeAndExtract(apiResult.html);
          return res.status(200).json(result);
        }
      } catch {
        // Fall through to regular fetch
      }
    }

    // Strategy 2: Fetch with realistic browser headers
    let htmlContent: string = '';
    let fetchOk = false;

    const primary = await fetchWithBrowserHeaders(url, 12000);
    if (primary.ok && hasUsableContent(primary.html)) {
      htmlContent = primary.html;
      fetchOk = true;
    }

    // Strategy 3: If primary failed or got blocked, try with a different approach
    if (!fetchOk) {
      // Some sites serve content to Googlebot
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10000);
        const googlebotResponse = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          redirect: 'follow',
        });
        clearTimeout(timer);
        if (googlebotResponse.ok) {
          const html = await googlebotResponse.text();
          if (hasUsableContent(html)) {
            htmlContent = html;
            fetchOk = true;
            logger.info('Fetched via Googlebot UA fallback', { endpoint: 'scrape-url', url });
          }
        }
      } catch {
        // Fall through
      }
    }

    // Strategy 4: For JS-rendered pages, try fetching Google's cached version
    if (!fetchOk) {
      try {
        const cacheUrl = `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(url)}`;
        const cacheResult = await fetchWithBrowserHeaders(cacheUrl, 8000);
        if (cacheResult.ok && hasUsableContent(cacheResult.html)) {
          htmlContent = cacheResult.html;
          fetchOk = true;
          logger.info('Fetched via Google cache fallback', { endpoint: 'scrape-url', url });
        }
      } catch {
        // Fall through
      }
    }

    if (!fetchOk || !htmlContent) {
      logger.warn('All fetch strategies failed', {
        endpoint: 'scrape-url',
        url,
        primaryStatus: primary.status,
        primaryLength: primary.html.length,
      });
      return res.status(502).json({
        error:
          'Could not fetch job posting — the site may be blocking automated access. Try pasting the job description directly.',
        code: 'UPSTREAM_ERROR',
        result: {},
        fallback: true,
      });
    }

    // Extract job data using AI
    const result = await scrapeAndExtract(htmlContent);
    return res.status(200).json(result);
  } catch (err) {
    logger.error('AI scrape extraction failed', { endpoint: 'scrape-url', error: err });
    return res.status(502).json({
      error: 'AI extraction failed',
      code: 'AI_ERROR',
      result: {},
      fallback: true,
    });
  }
}
