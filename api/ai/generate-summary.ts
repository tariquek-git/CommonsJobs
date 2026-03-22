import type { VercelRequest, VercelResponse } from '@vercel/node';
import { humanizeJobPost } from '../../lib/ai.js';
import { getClientIP, rateLimitOrReject, RATE_LIMITS } from '../../lib/rate-limit.js';
import { createHash } from 'crypto';

// In-memory dedup cache: prevents double-click duplicate AI calls (5s TTL)
const recentResults = new Map<string, { result: unknown; expiresAt: number }>();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }

  const ip = getClientIP(req);
  if (await rateLimitOrReject(ip, RATE_LIMITS.aiScrape, res)) return;

  try {
    const { description, title, preExtracted } = req.body as {
      description: string;
      title: string;
      preExtracted?: Record<string, string | undefined>;
    };

    if (!description || typeof description !== 'string' || description.trim().length < 20) {
      return res.status(400).json({
        error: 'Description must be at least 20 characters',
        code: 'BAD_REQUEST',
      });
    }

    const safeTitle = title && typeof title === 'string' ? title.trim() : '';

    // Dedup: return cached result if same request within 5 seconds
    const dedupKey = createHash('sha256')
      .update(ip + safeTitle + description.trim().slice(0, 500))
      .digest('hex')
      .slice(0, 16);
    const cached = recentResults.get(dedupKey);
    if (cached && cached.expiresAt > Date.now()) {
      return res.status(200).json(cached.result);
    }

    const result = await humanizeJobPost(description.trim(), safeTitle, preExtracted);

    // Cache for 5 seconds to prevent double-click duplicate calls
    recentResults.set(dedupKey, { result, expiresAt: Date.now() + 5000 });
    // Cleanup old entries periodically
    if (recentResults.size > 50) {
      const now = Date.now();
      for (const [key, val] of recentResults) {
        if (val.expiresAt < now) recentResults.delete(key);
      }
    }

    return res.status(200).json(result);
  } catch (err) {
    const { logger } = await import('../../lib/logger.js');
    logger.error('AI humanize failed', { endpoint: 'generate-summary', error: err });
    return res.status(502).json({
      error: 'AI processing failed',
      code: 'AI_ERROR',
      result: { humanized_description: '', standout_perks: [] },
      fallback: true,
    });
  }
}
