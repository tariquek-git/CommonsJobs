import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockReq, mockRes } from './helpers';

// ─── Mock setup ───

const mockIntro = {
  id: 'intro-1',
  name: 'Jane Doe',
  email: 'jane@example.com',
  linkedin: 'https://linkedin.com/in/jane',
  message: 'Interested',
  job_id: 'job-1',
  status: 'contacted',
  contact_responded_at: null,
};

const mockJob = {
  id: 'job-1',
  title: 'Engineer',
  company: 'Acme',
  submitter_name: 'HR Team',
  submitter_email: 'hr@acme.com',
};

let introLookupResult: unknown;
let updateResult: unknown;
let jobResult: unknown;

const mockFrom = vi.fn().mockImplementation((table: string) => {
  if (table === 'warm_intros') {
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(introLookupResult),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue(updateResult),
      }),
    };
  }
  if (table === 'email_logs') {
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    };
  }
  // jobs table
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(jobResult),
      }),
    }),
  };
});

vi.mock('../../lib/supabase.js', () => ({
  getSupabase: () => ({ from: mockFrom }),
  getJobsTable: () => 'jobs',
}));

vi.mock('../../lib/env.js', () => ({
  getEnv: () => '',
  validateEnv: () => {},
}));

vi.mock('../../lib/rate-limit.js', () => ({
  getClientIP: () => '127.0.0.1',
  rateLimitOrReject: vi.fn().mockResolvedValue(false),
  RATE_LIMITS: {
    introResponse: { limit: 5, windowMs: 3600000 },
  },
}));

vi.mock('../../lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../../lib/email.js', () => ({
  notifyAdminIntroAccepted: vi.fn().mockResolvedValue(true),
  notifyAdminIntroDeclined: vi.fn().mockResolvedValue(true),
  sendIntroAccepted: vi.fn().mockResolvedValue(true),
  sendIntroDeclined: vi.fn().mockResolvedValue(true),
  sendIntroToRequester: vi.fn().mockResolvedValue(true),
  sendIntroToContact: vi.fn().mockResolvedValue(true),
}));

import handler from '../../api/intro-response';
import { rateLimitOrReject } from '../../lib/rate-limit.js';

// ─── Tests ───

describe('POST /api/intro-response', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    introLookupResult = { data: { ...mockIntro }, error: null };
    updateResult = { error: null };
    jobResult = { data: { ...mockJob }, error: null };
  });

  // ── Validation ──

  it('rejects non-POST methods', async () => {
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(405);
  });

  it('rejects missing token', async () => {
    const req = mockReq({ body: { action: 'accepted' } });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect((res._json as { code: string }).code).toBe('VALIDATION_ERROR');
  });

  it('rejects missing action', async () => {
    const req = mockReq({ body: { token: 'abc-123' } });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect((res._json as { error: string }).error).toContain('Invalid action');
  });

  it('rejects invalid action', async () => {
    const req = mockReq({ body: { token: 'abc-123', action: 'maybe' } });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(400);
  });

  it('rejects empty body', async () => {
    const req = mockReq({ body: null });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(400);
  });

  // ── Token lookup ──

  it('returns 404 for invalid token', async () => {
    introLookupResult = { data: null, error: { message: 'Not found' } };
    const req = mockReq({ body: { token: 'bad-token', action: 'accepted' } });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(404);
    expect((res._json as { code: string }).code).toBe('TOKEN_NOT_FOUND');
  });

  // ── Double-response prevention ──

  it('returns already_responded when contact already responded', async () => {
    introLookupResult = {
      data: { ...mockIntro, contact_responded_at: '2026-03-18T12:00:00Z' },
      error: null,
    };
    const req = mockReq({ body: { token: 'valid-token', action: 'accepted' } });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    expect((res._json as { already_responded: boolean }).already_responded).toBe(true);
  });

  it('returns already_responded when status is not contacted', async () => {
    introLookupResult = {
      data: { ...mockIntro, status: 'connected' },
      error: null,
    };
    const req = mockReq({ body: { token: 'valid-token', action: 'accepted' } });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    expect((res._json as { already_responded: boolean }).already_responded).toBe(true);
  });

  // ── Successful responses ──

  it('accepts valid accepted response', async () => {
    const req = mockReq({ body: { token: 'valid-token', action: 'accepted' } });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    expect((res._json as { success: boolean }).success).toBe(true);
    expect((res._json as { action: string }).action).toBe('accepted');
  });

  it('accepts valid declined response', async () => {
    const req = mockReq({ body: { token: 'valid-token', action: 'declined' } });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    expect((res._json as { action: string }).action).toBe('declined');
  });

  it('rejects more_info as invalid action', async () => {
    const req = mockReq({ body: { token: 'valid-token', action: 'more_info' } });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect((res._json as { error: string }).error).toContain('Invalid action');
  });

  it('accepts optional note with response', async () => {
    const req = mockReq({
      body: { token: 'valid-token', action: 'accepted', note: 'Looks great!' },
    });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(200);
  });

  // ── Error handling ──

  it('returns 500 on update failure', async () => {
    updateResult = { error: { message: 'DB error' } };
    const req = mockReq({ body: { token: 'valid-token', action: 'accepted' } });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(500);
    expect((res._json as { code: string }).code).toBe('UPDATE_ERROR');
  });

  it('returns 429 when rate limited', async () => {
    (rateLimitOrReject as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);
    const req = mockReq({ body: { token: 'valid-token', action: 'accepted' } });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(0); // rateLimitOrReject handles the response
  });

  // ── Email sending ──

  it('still succeeds if email sending fails', async () => {
    const email = await import('../../lib/email.js');
    (email.notifyAdminIntroAccepted as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Email failed'),
    );
    const req = mockReq({ body: { token: 'valid-token', action: 'accepted' } });
    const res = mockRes();
    await handler(req, res);
    // Should still return success — email failure is non-blocking
    expect(res._status).toBe(200);
    expect((res._json as { success: boolean }).success).toBe(true);
  });
});
