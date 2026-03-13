import type { VercelRequest, VercelResponse } from '@vercel/node';
import { humanizeJobPost } from '../../lib/ai.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }

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
  } catch {
    return res.status(200).json({
      result: { humanized_description: '', standout_perks: [] },
      fallback: true,
    });
  }
}
