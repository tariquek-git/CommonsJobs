import { getSupabase } from '../lib/supabase.js';
import { getClientIP, RATE_LIMITS, rateLimitOrReject } from '../lib/rate-limit.js';
import { apiHandler } from '../lib/api-handler.js';
import { logger } from '../lib/logger.js';
import { createHash, randomBytes } from 'crypto';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VALID_CATEGORIES = [
  'Engineering',
  'Product',
  'Design',
  'Data',
  'Operations',
  'Sales/BD',
  'Marketing',
  'Finance',
  'Compliance/Risk',
  'Leadership',
];

const VALID_ARRANGEMENTS = ['Remote', 'Hybrid', 'On-site'];

export default apiHandler({ methods: ['GET', 'POST'], name: 'subscribe' }, async (req, res) => {
  // GET — Unsubscribe via token link
  if (req.method === 'GET') {
    const { token, action } = req.query;
    if (action === 'unsubscribe' && typeof token === 'string' && token.length >= 16) {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('job_subscribers')
          .update({ active: false, updated_at: new Date().toISOString() })
          .eq('unsubscribe_token', token)
          .eq('active', true)
          .select('email')
          .single();

        if (error || !data) {
          return res.status(200).send(unsubscribeHtml(false));
        }

        logger.info('Subscriber unsubscribed', { email: data.email });
        return res.status(200).send(unsubscribeHtml(true));
      } catch {
        return res.status(200).send(unsubscribeHtml(false));
      }
    }
    return res.status(400).json({ error: 'Invalid request' });
  }

  // POST — Subscribe to job alerts (rate limited)
  const ip = getClientIP(req);
  if (rateLimitOrReject(ip, RATE_LIMITS.submission, res)) return;

  const body = req.body as {
    email?: string;
    name?: string;
    type?: string;
    categories?: string[];
    tags?: string[];
    work_arrangement?: string;
    location?: string;
    frequency?: string;
  };

  if (!body.email || typeof body.email !== 'string' || !EMAIL_RE.test(body.email.trim())) {
    return res.status(400).json({ error: 'Valid email is required', code: 'BAD_REQUEST' });
  }

  const email = body.email.trim().toLowerCase();
  const name = body.name && typeof body.name === 'string' ? body.name.trim().slice(0, 100) : null;
  const type = body.type === 'employer' ? 'employer' : 'candidate';

  const categories =
    Array.isArray(body.categories) && body.categories.length > 0
      ? body.categories.filter((c) => VALID_CATEGORIES.includes(c)).slice(0, 5)
      : [];

  const tags =
    Array.isArray(body.tags) && body.tags.length > 0
      ? body.tags
          .filter((t) => typeof t === 'string' && t.length > 0 && t.length <= 50)
          .map((t) => t.toLowerCase().trim())
          .slice(0, 10)
      : [];

  const work_arrangement =
    typeof body.work_arrangement === 'string' && VALID_ARRANGEMENTS.includes(body.work_arrangement)
      ? body.work_arrangement
      : null;

  const location =
    typeof body.location === 'string' && body.location.trim().length > 0
      ? body.location.trim().slice(0, 100)
      : null;

  const frequency = body.frequency === 'weekly' ? 'weekly' : 'instant';
  const ipHash = createHash('sha256').update(ip).digest('hex');

  const supabase = getSupabase();

  const { error } = await supabase
    .from('job_subscribers')
    .upsert(
      {
        email,
        name,
        type,
        categories,
        tags,
        work_arrangement,
        location,
        frequency,
        active: true,
        unsubscribe_token: randomBytes(32).toString('hex'),
        ip_hash: ipHash,
        referrer: (req.headers['referer'] as string) || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'email' },
    )
    .select('id')
    .single();

  if (error) {
    logger.error('Subscribe insert failed', { error, email });
    return res.status(500).json({ error: 'Subscription failed', code: 'STORAGE_ERROR' });
  }

  logger.info('New subscriber', { email, type, categories, frequency });

  return res.status(200).json({
    subscribed: true,
    message:
      type === 'employer'
        ? "You're subscribed. We'll keep you posted on Fintech Commons updates."
        : categories.length > 0
          ? `You'll get alerts for new ${categories.join(', ')} roles.`
          : "You'll get alerts for all new roles.",
  });
});

function unsubscribeHtml(success: boolean): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${success ? 'Unsubscribed' : 'Link Invalid'} — Fintech Commons</title>
<style>body{margin:0;padding:40px 20px;background:#F8FAFC;font-family:system-ui,-apple-system,sans-serif;text-align:center;}
.card{max-width:440px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #E2E8F0;padding:40px 32px;}
h1{font-size:24px;color:#0A2540;margin:0 0 12px;}
p{font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;}
a{color:#635BFF;text-decoration:none;font-weight:600;}</style>
</head>
<body>
<div class="card">
${
  success
    ? `<h1>You're unsubscribed 👋</h1><p>You won't receive any more job alerts. If you change your mind, you can always re-subscribe on the site.</p>`
    : `<h1>Hmm, that link didn't work</h1><p>It may have already been used or expired. If you're still getting emails you don't want, reply to any of them and we'll sort it out.</p>`
}
<a href="https://www.fintechcommons.com">← Back to Fintech Commons</a>
</div>
</body>
</html>`;
}
