import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../../../lib/auth.js';
import { getSupabase } from '../../../lib/supabase.js';
import { getClientIP, rateLimitOrReject, RATE_LIMITS } from '../../../lib/rate-limit.js';

/**
 * GET /api/admin/email/logs
 *
 * Query email audit trail. Filterable by:
 *   ?job_id=xxx       — all emails related to a job
 *   ?intro_id=xxx     — all emails related to a warm intro
 *   ?recipient=email  — all emails sent to a specific person
 *   ?event_type=xxx   — filter by event type
 *   ?limit=50         — max results (default 50, max 200)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!requireAdmin(req as unknown as Request)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const ip = getClientIP(req as unknown as Request);
  if (await rateLimitOrReject(ip, RATE_LIMITS.adminRead, res)) return;

  try {
    const supabase = getSupabase();
    const jobId = req.query.job_id as string | undefined;
    const introId = req.query.intro_id as string | undefined;
    const recipient = req.query.recipient as string | undefined;
    const eventType = req.query.event_type as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

    let query = supabase
      .from('email_logs')
      .select(
        'id, event_type, recipient, subject, status, error_message, metadata, related_job_id, related_warm_intro_id, created_at',
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (jobId) query = query.eq('related_job_id', jobId);
    if (introId) query = query.eq('related_warm_intro_id', introId);
    if (recipient) query = query.eq('recipient', recipient);
    if (eventType) query = query.eq('event_type', eventType);

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch email logs' });
    }

    // Shape response — extract body_text and from from metadata for convenience
    const logs = (data || []).map((log) => {
      const meta = (log.metadata || {}) as Record<string, unknown>;
      return {
        id: log.id,
        event_type: log.event_type,
        recipient: log.recipient,
        subject: log.subject,
        status: log.status,
        error_message: log.error_message,
        from: meta.from || null,
        body_text: meta.body_text || null,
        resend_id: meta.resend_id || null,
        related_job_id: log.related_job_id,
        related_warm_intro_id: log.related_warm_intro_id,
        created_at: log.created_at,
      };
    });

    // Also compute per-recipient summary
    const recipientMap = new Map<string, { count: number; lastSent: string; types: Set<string> }>();
    for (const log of logs) {
      const existing = recipientMap.get(log.recipient);
      if (existing) {
        existing.count++;
        existing.types.add(log.event_type);
      } else {
        recipientMap.set(log.recipient, {
          count: 1,
          lastSent: log.created_at,
          types: new Set([log.event_type]),
        });
      }
    }

    const recipients = Array.from(recipientMap.entries()).map(([email, data]) => ({
      email,
      count: data.count,
      last_sent: data.lastSent,
      event_types: Array.from(data.types),
    }));

    return res.status(200).json({ logs, recipients, total: logs.length });
  } catch {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
