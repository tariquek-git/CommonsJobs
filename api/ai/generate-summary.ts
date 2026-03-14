import type { VercelRequest, VercelResponse } from '@vercel/node';
import { humanizeJobPost } from '../../lib/ai.js';
import { getClientIP, rateLimitOrReject, RATE_LIMITS } from '../../lib/rate-limit.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }

  const ip = getClientIP(req);
  if (rateLimitOrReject(ip, RATE_LIMITS.aiScrape, res)) return;

  try {
    const { description, title } = req.body as { description: string; title: string };

    if (!description || typeof description !== 'string' || description.trim().length < 20) {
      return res.status(400).json({
        error: 'Description must be at least 20 characters',
        code: 'BAD_REQUEST',
      });
    }

    if (!title || typeof title !== 'string' || title.trim().length < 2) {
      return res.status(400).json({
        error: 'Title is required',
        code: 'BAD_REQUEST',
      });
    }

    const result = await humanizeJobPost(description.trim(), title.trim());
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
