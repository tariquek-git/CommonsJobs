import type { VercelRequest, VercelResponse } from '@vercel/node';
import { scrapeAndExtract } from '../../lib/ai.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const { url } = req.body as { url: string };

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required', code: 'BAD_REQUEST' });
    }

    // Validate URL format
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return res.status(400).json({ error: 'URL must use HTTP or HTTPS', code: 'BAD_REQUEST' });
      }
    } catch {
      return res.status(400).json({ error: 'Invalid URL format', code: 'BAD_REQUEST' });
    }

    // Fetch the URL content
    let htmlContent: string;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CommonsJobs/1.0)',
          Accept: 'text/html,application/xhtml+xml',
        },
      });

      clearTimeout(timer);

      if (!response.ok) {
        return res.status(200).json({
          result: {},
          fallback: true,
        });
      }

      htmlContent = await response.text();
    } catch {
      // URL fetch failed - return fallback
      return res.status(200).json({
        result: {},
        fallback: true,
      });
    }

    // Extract job data using AI
    const result = await scrapeAndExtract(htmlContent);
    return res.status(200).json(result);
  } catch (err) {
    // Fail-open
    return res.status(200).json({
      result: {},
      fallback: true,
    });
  }
}
