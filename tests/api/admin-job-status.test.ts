import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockReq, mockRes } from './helpers';

// ── Mock data ──
const mockPendingJob = {
  id: 'job-1',
  title: 'Senior Engineer',
  company: 'FinCo',
  description: 'A great engineering role with excellent benefits and growth.',
  status: 'pending',
  submitter_email: 'hr@finco.com',
  submitter_name: 'HR Team',
  summary: null,
  location: null,
  country: null,
  salary_range: null,
  employment_type: null,
  work_arrangement: null,
  company_url: null,
  category: 'Engineering',
  tags: ['typescript'],
};

const mockActiveJob = {
  ...mockPendingJob,
  status: 'active',
  summary: 'A humanized summary',
};

// ── Proxy-based chain helper (matches admin-warm-intros pattern) ──
let jobsResult: unknown;
let emailLogsResult: unknown;
let updateResult: unknown;

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

// Track which table is being accessed and what operation
let fromCallCount: Record<string, number> = {};
const mockFrom = vi.fn().mockImplementation((table: string) => {
  fromCallCount[table] = (fromCallCount[table] || 0) + 1;

  if (table === 'email_logs') {
    return chain(() => emailLogsResult);
  }
  // jobs table: first call is select (fetch), second is update
  const callNum = fromCallCount[table];
  if (callNum === 1) {
    return chain(() => jobsResult);
  }
  return chain(() => updateResult);
});

vi.mock('../../lib/supabase.js', () => ({
  getSupabase: () => ({ from: mockFrom }),
  getJobsTable: () => 'jobs',
}));

vi.mock('../../lib/env.js', () => ({
  getEnv: () => 'test-secret',
  validateEnv: () => {},
}));

vi.mock('../../lib/auth.js', () => ({
  requireAdmin: vi.fn().mockReturnValue(true),
  extractToken: vi.fn().mockReturnValue('test-token'),
}));

vi.mock('../../lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const mockSendJobApproved = vi.fn().mockResolvedValue({});
const mockSendJobRejected = vi.fn().mockResolvedValue({});
const mockNotifyMatchingSubscribers = vi.fn().mockResolvedValue({});

vi.mock('../../lib/email.js', () => ({
  sendJobApproved: (...args: unknown[]) => mockSendJobApproved(...args),
  sendJobRejected: (...args: unknown[]) => mockSendJobRejected(...args),
  notifyMatchingSubscribers: (...args: unknown[]) => mockNotifyMatchingSubscribers(...args),
}));

const mockHumanizeJobPost = vi.fn().mockResolvedValue({
  fallback: false,
  result: {
    humanized_description: 'AI-generated summary for the role.',
    standout_perks: ['Equity', 'Remote'],
    location: 'San Francisco, CA',
    country: 'United States',
    salary_range: '$150K–$200K',
    employment_type: 'Full-time',
    work_arrangement: 'Remote',
  },
});

vi.mock('../../lib/ai.js', () => ({
  humanizeJobPost: (...args: unknown[]) => mockHumanizeJobPost(...args),
}));

vi.mock('../../lib/rate-limit.js', () => ({
  getClientIP: () => '127.0.0.1',
  rateLimitOrReject: vi.fn().mockResolvedValue(false),
  RATE_LIMITS: {},
}));

import handler from '../../api/admin/jobs/[id]/status';
import { requireAdmin } from '../../lib/auth.js';

describe('PATCH /api/admin/jobs/[id]/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromCallCount = {};
    (requireAdmin as ReturnType<typeof vi.fn>).mockReturnValue(true);
    jobsResult = { data: mockPendingJob, error: null };
    updateResult = { data: mockActiveJob, error: null };
    emailLogsResult = { data: [], error: null };
    mockHumanizeJobPost.mockResolvedValue({
      fallback: false,
      result: {
        humanized_description: 'AI-generated summary for the role.',
        standout_perks: ['Equity', 'Remote'],
        location: 'San Francisco, CA',
        country: 'United States',
        salary_range: '$150K–$200K',
        employment_type: 'Full-time',
        work_arrangement: 'Remote',
      },
    });
  });

  it('rejects non-PATCH methods (GET → 405)', async () => {
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(405);
  });

  it('returns 401 without admin auth', async () => {
    (requireAdmin as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const req = mockReq({
      method: 'PATCH',
      query: { id: 'job-1' },
      body: { status: 'active' },
    });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(401);
  });

  it('returns 400 for missing job ID', async () => {
    const req = mockReq({
      method: 'PATCH',
      query: {},
      body: { status: 'active' },
    });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect((res._json as { code: string }).code).toBe('BAD_REQUEST');
  });

  it('returns 400 for invalid status value', async () => {
    const req = mockReq({
      method: 'PATCH',
      query: { id: 'job-1' },
      body: { status: 'banana' },
    });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect((res._json as { code: string }).code).toBe('BAD_REQUEST');
    expect((res._json as { error: string }).error).toContain('Status must be one of');
  });

  it('returns 400 when status is missing', async () => {
    const req = mockReq({
      method: 'PATCH',
      query: { id: 'job-1' },
      body: {},
    });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(400);
  });

  it('returns 404 for non-existent job', async () => {
    jobsResult = { data: null, error: { message: 'not found' } };
    const req = mockReq({
      method: 'PATCH',
      query: { id: 'nonexistent' },
      body: { status: 'active' },
    });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(404);
    expect((res._json as { code: string }).code).toBe('NOT_FOUND');
  });

  it('approves pending→active: calls AI humanize, sends email, returns 200', async () => {
    const req = mockReq({
      method: 'PATCH',
      query: { id: 'job-1' },
      body: { status: 'active' },
    });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(mockHumanizeJobPost).toHaveBeenCalledWith(
      mockPendingJob.description,
      mockPendingJob.title,
      expect.objectContaining({ company: 'FinCo' }),
    );
    // Approval email should fire (dedup check returned empty)
    expect(mockSendJobApproved).toHaveBeenCalledWith(
      expect.objectContaining({
        submitterEmail: 'hr@finco.com',
        jobTitle: 'Senior Engineer',
        jobCompany: 'FinCo',
      }),
    );
    // Subscriber notifications should fire
    expect(mockNotifyMatchingSubscribers).toHaveBeenCalled();
  });

  it('approval skips AI when job already has summary', async () => {
    jobsResult = {
      data: { ...mockPendingJob, summary: 'Existing summary' },
      error: null,
    };
    const req = mockReq({
      method: 'PATCH',
      query: { id: 'job-1' },
      body: { status: 'active' },
    });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(mockHumanizeJobPost).not.toHaveBeenCalled();
  });

  it('approval continues even if AI fails', async () => {
    mockHumanizeJobPost.mockRejectedValueOnce(new Error('AI timeout'));
    const req = mockReq({
      method: 'PATCH',
      query: { id: 'job-1' },
      body: { status: 'active' },
    });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(200);
  });

  it('approval dedup: skips email if already sent', async () => {
    emailLogsResult = { data: [{ id: 'log-1' }], error: null };
    const req = mockReq({
      method: 'PATCH',
      query: { id: 'job-1' },
      body: { status: 'active' },
    });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(mockSendJobApproved).not.toHaveBeenCalled();
  });

  it('rejects pending→rejected: sends rejection email, returns 200', async () => {
    updateResult = {
      data: {
        ...mockPendingJob,
        status: 'rejected',
        submitter_email: 'hr@finco.com',
        submitter_name: 'HR Team',
      },
      error: null,
    };
    const req = mockReq({
      method: 'PATCH',
      query: { id: 'job-1' },
      body: { status: 'rejected', rejection_reason: 'not_fintech' },
    });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(mockSendJobRejected).toHaveBeenCalledWith(
      expect.objectContaining({
        submitterEmail: 'hr@finco.com',
        jobTitle: 'Senior Engineer',
        reason: 'not_fintech',
      }),
    );
    // Should NOT call approval emails
    expect(mockSendJobApproved).not.toHaveBeenCalled();
    expect(mockNotifyMatchingSubscribers).not.toHaveBeenCalled();
  });

  it('archives active→archived without emails', async () => {
    jobsResult = { data: { ...mockPendingJob, status: 'active' }, error: null };
    updateResult = {
      data: { ...mockPendingJob, status: 'archived' },
      error: null,
    };
    const req = mockReq({
      method: 'PATCH',
      query: { id: 'job-1' },
      body: { status: 'archived' },
    });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(mockSendJobApproved).not.toHaveBeenCalled();
    expect(mockSendJobRejected).not.toHaveBeenCalled();
  });

  it('returns 500 when update fails', async () => {
    updateResult = { data: null, error: { message: 'DB write error' } };
    const req = mockReq({
      method: 'PATCH',
      query: { id: 'job-1' },
      body: { status: 'active' },
    });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(500);
    expect((res._json as { code: string }).code).toBe('STORAGE_ERROR');
  });
});
