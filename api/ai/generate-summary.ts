import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateJobSummary } from '../../lib/ai.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const { description } = req.body as { description: string };

    if (!description || typeof description !== 'string' || description.trim().length < 20) {
      return res.status(400).json({
        error: 'Description must be at least 20 characters',
        code: 'BAD_REQUEST',
      });
    }

    const result = await generateJobSummary(description.trim());
    return res.status(200).json(result);
  } catch (err) {
    // Fail-open: return fallback response instead of error
    return res.status(200).json({
      result: 'AI is temporarily unavailable. Please write a summary manually.',
      fallback: true,
    });
  }
}
