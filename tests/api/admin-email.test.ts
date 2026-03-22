import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockReq, mockRes } from './helpers';

// ── Proxy chain helper ──
function chain(resolvedValue: () => unknown) {
  const make = (): unknown =>
    new Proxy(() => {}, {
      get(_t, prop: string) {
        if (prop === 'then') {
          return (fn: (v: unknown) => void) => Promise.resolve(fn(resolvedValue()));
        }
        if (prop === 'catch' || prop === 'finally') {
          return () => Promise.resolve(resolvedValue());
        }
        return make();
      },
      apply() {
        return make();
      },
    });
  return make();
}

// ── Mock data for email logs ──
const mockEmailLogs = [
  {
    id: 'log-1',
    event_type: 'job_approved_notification',
    recipient: 'user@example.com',
    subject: 'Your job has been approved',
    status: 'sent',
    error_message: null,
    metadata: { from: 'noreply@fintechcommons.com', body_text: 'Congrats', resend_id: 'r-123' },
    related_job_id: 'job-1',
    related_warm_intro_id: null,
    created_at: '2026-03-14T10:00:00Z',
  },
  {
    id: 'log-2',
    event_type: 'job_rejected_notification',
    recipient: 'other@example.com',
    subject: 'Submission update',
    status: 'sent',
    error_message: null,
    metadata: { from: 'noreply@fintechcommons.com', resend_id: 'r-456' },
    related_job_id: 'job-2',
    related_warm_intro_id: null,
    created_at: '2026-03-13T10:00:00Z',
  },
];

let emailLogsResult: unknown;

const mockFrom = vi.fn().mockImplementation(() => {
  return chain(() => emailLogsResult);
});

vi.mock('../../lib/supabase.js', () => ({
  getSupabase: () => ({ from: mockFrom }),
  getJobsTable: () => 'jobs',
}));

// Track what getEnv returns per key
const envValues: Record<string, string> = {
  RESEND_API_KEY: 'test-resend-key',
  RESEND_DOMAIN: 'fintechcommons.com',
  ADMIN_NOTIFICATION_EMAIL: 'admin@test.com',
};

vi.mock('../../lib/env.js', () => ({
  getEnv: vi.fn((key: string, fallback?: string) => envValues[key] ?? fallback ?? ''),
  validateEnv: () => {},
}));

vi.mock('../../lib/auth.js', () => ({
  requireAdmin: vi.fn().mockReturnValue(true),
}));

vi.mock('../../lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../../lib/rate-limit.js', () => ({
  getClientIP: () => '127.0.0.1',
  rateLimitOrReject: vi.fn().mockResolvedValue(false),
  RATE_LIMITS: {
    adminRead: { limit: 60, windowMs: 60000 },
  },
}));

// Mock global fetch for Resend API calls
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import sendHandler from '../../api/admin/email/send';
import logsHandler from '../../api/admin/email/logs';
import { requireAdmin } from '../../lib/auth.js';

// ═══════════════════════════════════════════════════════════
// POST /api/admin/email/send
// ═══════════════════════════════════════════════════════════
describe('POST /api/admin/email/send', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireAdmin as ReturnType<typeof vi.fn>).mockReturnValue(true);
    envValues.RESEND_API_KEY = 'test-resend-key';
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'resend-msg-id' }),
    });
  });

  it('rejects non-POST methods', async () => {
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await sendHandler(req, res);
    expect(res._status).toBe(405);
  });

  it('returns 401 without admin auth', async () => {
    (requireAdmin as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const req = mockReq({
      method: 'POST',
      body: { to: 'user@test.com', subject: 'Hi', body: 'Hello' },
    });
    const res = mockRes();
    await sendHandler(req, res);
    expect(res._status).toBe(401);
  });

  it('returns 503 when RESEND_API_KEY is not configured', async () => {
    envValues.RESEND_API_KEY = '';
    const req = mockReq({
      method: 'POST',
      body: { to: 'user@test.com', subject: 'Hi', body: 'Hello' },
    });
    const res = mockRes();
    await sendHandler(req, res);
    expect(res._status).toBe(503);
    expect((res._json as { error: string }).error).toContain('not configured');
  });

  it('sends email successfully with valid fields', async () => {
    const req = mockReq({
      method: 'POST',
      body: {
        to: 'user@test.com',
        subject: 'Test Subject',
        body: 'Test body content',
        replyTo: 'reply@test.com',
      },
    });
    const res = mockRes();
    await sendHandler(req, res);
    expect(res._status).toBe(200);
    const json = res._json as { success: boolean; id: string };
    expect(json.success).toBe(true);
    expect(json.id).toBe('resend-msg-id');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('returns 400 when required fields are missing', async () => {
    const req = mockReq({
      method: 'POST',
      body: { to: 'user@test.com' }, // missing subject and body
    });
    const res = mockRes();
    await sendHandler(req, res);
    expect(res._status).toBe(400);
    expect((res._json as { error: string }).error).toContain('Missing required fields');
    const details = (res._json as { details: string[] }).details;
    expect(details).toContain('subject');
    expect(details).toContain('body');
  });

  it('returns 400 for invalid email format', async () => {
    const req = mockReq({
      method: 'POST',
      body: { to: 'not-an-email', subject: 'Test', body: 'Body' },
    });
    const res = mockRes();
    await sendHandler(req, res);
    expect(res._status).toBe(400);
    expect((res._json as { error: string }).error).toContain('Invalid email');
  });

  it('returns 400 for invalid replyTo email', async () => {
    const req = mockReq({
      method: 'POST',
      body: { to: 'user@test.com', subject: 'Test', body: 'Body', replyTo: 'bad-email' },
    });
    const res = mockRes();
    await sendHandler(req, res);
    expect(res._status).toBe(400);
    expect((res._json as { error: string }).error).toContain('Invalid reply-to');
  });

  it('returns 502 when Resend API fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: () => Promise.resolve({ message: 'Validation error' }),
    });
    const req = mockReq({
      method: 'POST',
      body: { to: 'user@test.com', subject: 'Test', body: 'Body' },
    });
    const res = mockRes();
    await sendHandler(req, res);
    expect(res._status).toBe(502);
    expect((res._json as { error: string }).error).toContain('Failed to send');
  });

  it('returns 500 when fetch throws an exception', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network failure'));
    const req = mockReq({
      method: 'POST',
      body: { to: 'user@test.com', subject: 'Test', body: 'Body' },
    });
    const res = mockRes();
    await sendHandler(req, res);
    expect(res._status).toBe(500);
    expect((res._json as { error: string }).error).toContain('Email delivery failed');
  });
});

// ═══════════════════════════════════════════════════════════
// GET /api/admin/email/logs
// ═══════════════════════════════════════════════════════════
describe('GET /api/admin/email/logs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireAdmin as ReturnType<typeof vi.fn>).mockReturnValue(true);
    emailLogsResult = { data: mockEmailLogs, error: null };
  });

  it('rejects non-GET methods', async () => {
    const req = mockReq({ method: 'POST' });
    const res = mockRes();
    await logsHandler(req, res);
    expect(res._status).toBe(405);
  });

  it('returns 401 without admin auth', async () => {
    (requireAdmin as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await logsHandler(req, res);
    expect(res._status).toBe(401);
  });

  it('returns logs array with recipient summaries', async () => {
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await logsHandler(req, res);
    expect(res._status).toBe(200);
    const json = res._json as {
      logs: Record<string, unknown>[];
      recipients: Record<string, unknown>[];
      total: number;
    };
    expect(json.logs).toHaveLength(2);
    expect(json.total).toBe(2);
    expect(json.recipients).toHaveLength(2);
    // Verify log shaping: metadata fields extracted to top-level
    expect(json.logs[0]).toHaveProperty('from');
    expect(json.logs[0]).toHaveProperty('resend_id');
    expect(json.logs[0]).toHaveProperty('event_type', 'job_approved_notification');
  });

  it('passes job_id filter to query', async () => {
    const req = mockReq({ method: 'GET', query: { job_id: 'job-1' } });
    const res = mockRes();
    await logsHandler(req, res);
    expect(res._status).toBe(200);
    // from() was called with 'email_logs'
    expect(mockFrom).toHaveBeenCalledWith('email_logs');
  });

  it('passes event_type filter to query', async () => {
    const req = mockReq({ method: 'GET', query: { event_type: 'job_approved_notification' } });
    const res = mockRes();
    await logsHandler(req, res);
    expect(res._status).toBe(200);
    expect(mockFrom).toHaveBeenCalledWith('email_logs');
  });

  it('returns empty logs when no data', async () => {
    emailLogsResult = { data: [], error: null };
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await logsHandler(req, res);
    expect(res._status).toBe(200);
    const json = res._json as { logs: unknown[]; total: number };
    expect(json.logs).toHaveLength(0);
    expect(json.total).toBe(0);
  });

  it('returns 500 on database error', async () => {
    emailLogsResult = { data: null, error: { message: 'DB error' } };
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await logsHandler(req, res);
    expect(res._status).toBe(500);
    expect((res._json as { error: string }).error).toContain('Failed to fetch');
  });
});
