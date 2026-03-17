import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../../../lib/auth';
import { getEnv } from '../../../lib/env';

/**
 * POST /api/admin/email/send
 *
 * Send an email using a template.
 * Requires Resend API key to be configured.
 *
 * Body:
 *   template: string — template ID (job_approved, warm_intro_request, etc.)
 *   to: string — recipient email
 *   subject: string — filled subject line
 *   body: string — filled email body (plain text / markdown)
 *   replyTo?: string — reply-to address
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    requireAdmin(req);
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const resendKey = getEnv('RESEND_API_KEY', '');
  if (!resendKey) {
    return res.status(503).json({
      error: 'Email not configured',
      details: 'RESEND_API_KEY environment variable is not set. Add it to enable email sending.',
    });
  }

  const { to, subject, body, replyTo } = req.body || {};

  if (!to || !subject || !body) {
    return res.status(400).json({
      error: 'Missing required fields',
      details: ['to', 'subject', 'body'].filter((f) => !req.body?.[f]),
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Fintech Commons <noreply@${getEnv('RESEND_DOMAIN', 'fintechcommons.com')}>`,
        to: [to],
        subject,
        text: body,
        reply_to: replyTo || getEnv('ADMIN_NOTIFICATION_EMAIL', ''),
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'Unknown error' }));
      return res.status(502).json({
        error: 'Failed to send email',
        details: err.message || `Resend API returned ${response.status}`,
      });
    }

    const result = await response.json();
    return res.status(200).json({
      success: true,
      id: result.id,
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Email delivery failed',
      details: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
