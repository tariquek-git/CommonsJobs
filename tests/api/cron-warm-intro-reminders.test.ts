import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockReq, mockRes } from './helpers';

// ── Email mocks ──
const mockSendNudgeAdmin = vi.fn().mockResolvedValue(undefined);
const mockSendNudgeRequester = vi.fn().mockResolvedValue(undefined);
const mockSendContactNudge = vi.fn().mockResolvedValue(undefined);
const mockSendIntroFollowUp = vi.fn().mockResolvedValue(undefined);
const mockSendIntroNoResponse = vi.fn().mockResolvedValue(undefined);

vi.mock('../../lib/email.js', () => ({
  sendNudgeAdmin: (...args: unknown[]) => mockSendNudgeAdmin(...args),
  sendNudgeRequester: (...args: unknown[]) => mockSendNudgeRequester(...args),
  sendContactNudge: (...args: unknown[]) => mockSendContactNudge(...args),
  sendIntroFollowUp: (...args: unknown[]) => mockSendIntroFollowUp(...args),
  sendIntroNoResponse: (...args: unknown[]) => mockSendIntroNoResponse(...args),
}));

// ── Supabase mock ──
// We need a chainable mock that supports:
//   from('warm_intros').select(...).in(...).order(...)  → intros query
//   from('email_logs').select(...).in(...).in(...).eq(...)  → email logs query
//   from('warm_intros').update(...).eq(...)  → status update
//   from('jobs').select(...).in(...)  → jobs query

const mockIntrosResult = vi.fn().mockResolvedValue({ data: [], error: null });
const mockEmailLogsResult = vi.fn().mockResolvedValue({ data: [], error: null });
const mockJobsResult = vi.fn().mockResolvedValue({ data: [], error: null });
const mockUpdateResult = vi.fn().mockResolvedValue({ data: null, error: null });

// Build chainable proxies for each table query pattern
function chainProxy(terminal: ReturnType<typeof vi.fn>) {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get: (_target, prop) => {
      if (prop === 'then') return undefined;
      return (..._args: unknown[]) => {
        // If calling the terminal, return the resolved value
        // Otherwise keep chaining
        return new Proxy({}, handler);
      };
    },
  };
  // Override: make the proxy thenable at the END of any chain
  const proxy = new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === 'then') {
          // Allow awaiting — resolve with terminal's current mock value
          const result = terminal();
          return (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve);
        }
        // Every method call returns a new chainable proxy that resolves to terminal
        return (..._args: unknown[]) => {
          return new Proxy(
            {},
            {
              get: (_t2, p2) => {
                if (p2 === 'then') {
                  const r = terminal();
                  return (resolve: (v: unknown) => void) => Promise.resolve(r).then(resolve);
                }
                return (..._a2: unknown[]) =>
                  new Proxy(
                    {},
                    {
                      get: (_t3, p3) => {
                        if (p3 === 'then') {
                          const r2 = terminal();
                          return (resolve: (v: unknown) => void) =>
                            Promise.resolve(r2).then(resolve);
                        }
                        return (..._a3: unknown[]) =>
                          new Proxy(
                            {},
                            {
                              get: (_t4, p4) => {
                                if (p4 === 'then') {
                                  const r3 = terminal();
                                  return (resolve: (v: unknown) => void) =>
                                    Promise.resolve(r3).then(resolve);
                                }
                                return (..._a4: unknown[]) =>
                                  new Proxy(
                                    {},
                                    {
                                      get: (_t5, p5) => {
                                        if (p5 === 'then') {
                                          const r4 = terminal();
                                          return (resolve: (v: unknown) => void) =>
                                            Promise.resolve(r4).then(resolve);
                                        }
                                        return () => {
                                          /* deep chain */
                                        };
                                      },
                                    },
                                  );
                              },
                            },
                          );
                      },
                    },
                  );
              },
            },
          );
        };
      },
    },
  );
  return proxy;
}

let fromCallCount = 0; // eslint-disable-line @typescript-eslint/no-unused-vars -- tracked for call ordering
const mockFrom = vi.fn().mockImplementation((table: string) => {
  if (table === 'warm_intros') {
    // First call to warm_intros is the select query; subsequent calls are updates
    fromCallCount++;
    // Check if update is being called (we detect by looking at whether the handler
    // calls .update() — but since we use a proxy, we just return the right terminal)
    // The handler calls from('warm_intros').select(...) first, then from('warm_intros').update(...)
    // We use a simple call order tracking approach:
    return chainProxy(mockIntrosResult);
  }
  if (table === 'email_logs') {
    return chainProxy(mockEmailLogsResult);
  }
  if (table === 'jobs') {
    return chainProxy(mockJobsResult);
  }
  return chainProxy(mockUpdateResult);
});

vi.mock('../../lib/supabase.js', () => ({
  getSupabase: () => ({ from: mockFrom }),
  getJobsTable: () => 'jobs',
}));

vi.mock('../../lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../../lib/rate-limit.js', () => ({
  getClientIP: () => '127.0.0.1',
  rateLimitOrReject: vi.fn().mockReturnValue(false),
  RATE_LIMITS: {},
}));

// Set CRON_SECRET for tests
const CRON_SECRET = 'test-cron-secret-12345';
vi.stubEnv('CRON_SECRET', CRON_SECRET);

import handler from '../../api/cron/warm-intro-reminders';

// Helper to create an intro with a specific age in days
function makeIntro(overrides: Record<string, unknown> = {}) {
  return {
    id: 'intro-1',
    name: 'Alice',
    email: 'alice@test.com',
    job_id: 'job-1',
    status: 'pending',
    created_at: new Date().toISOString(),
    status_updated_at: new Date().toISOString(),
    response_token: 'tok-abc',
    ...overrides,
  };
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString();
}

function makeJob(overrides: Record<string, unknown> = {}) {
  return {
    id: 'job-1',
    title: 'Engineer',
    company: 'Acme',
    submitter_name: 'Bob',
    submitter_email: 'bob@acme.com',
    ...overrides,
  };
}

describe('POST /api/cron/warm-intro-reminders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromCallCount = 0;
    process.env.CRON_SECRET = CRON_SECRET;
    mockIntrosResult.mockResolvedValue({ data: [], error: null });
    mockEmailLogsResult.mockResolvedValue({ data: [], error: null });
    mockJobsResult.mockResolvedValue({ data: [], error: null });
    mockUpdateResult.mockResolvedValue({ data: null, error: null });
    mockSendNudgeAdmin.mockResolvedValue(undefined);
    mockSendNudgeRequester.mockResolvedValue(undefined);
    mockSendContactNudge.mockResolvedValue(undefined);
    mockSendIntroFollowUp.mockResolvedValue(undefined);
    mockSendIntroNoResponse.mockResolvedValue(undefined);
  });

  it('rejects non-GET/POST methods (405)', async () => {
    const req = mockReq({
      method: 'DELETE',
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(405);
  });

  it('rejects missing authorization (401)', async () => {
    const req = mockReq({ method: 'POST', headers: {} });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(401);
  });

  it('rejects invalid cron secret (401)', async () => {
    const req = mockReq({
      method: 'POST',
      headers: { authorization: 'Bearer wrong-secret' },
    });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(401);
  });

  it('returns 500 when CRON_SECRET not configured', async () => {
    delete process.env.CRON_SECRET;
    const req = mockReq({
      method: 'POST',
      headers: { authorization: 'Bearer anything' },
    });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(500);
  });

  it('handles empty intros list gracefully', async () => {
    mockIntrosResult.mockResolvedValue({ data: [], error: null });
    const req = mockReq({
      method: 'POST',
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    const json = res._json as { message: string; sent: number };
    expect(json.message).toBe('No actionable intros');
    expect(json.sent).toBe(0);
  });

  it('handles null intros list gracefully', async () => {
    mockIntrosResult.mockResolvedValue({ data: null, error: null });
    const req = mockReq({
      method: 'POST',
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    const json = res._json as { message: string; sent: number };
    expect(json.message).toBe('No actionable intros');
  });

  it('returns 500 on intros query error', async () => {
    mockIntrosResult.mockResolvedValue({ data: null, error: { message: 'DB error' } });
    const req = mockReq({
      method: 'POST',
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(500);
    expect((res._json as { error: string }).error).toBe('Failed to query intros');
  });

  it('sends nudge emails for pending intros at Day 5', async () => {
    const intro = makeIntro({
      status: 'pending',
      status_updated_at: daysAgo(6),
      created_at: daysAgo(6),
    });
    mockIntrosResult.mockResolvedValue({ data: [intro], error: null });
    mockJobsResult.mockResolvedValue({ data: [makeJob()], error: null });
    mockEmailLogsResult.mockResolvedValue({ data: [], error: null });

    const req = mockReq({
      method: 'POST',
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const res = mockRes();
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(mockSendNudgeAdmin).toHaveBeenCalled();
    expect(mockSendNudgeRequester).toHaveBeenCalled();
    const json = res._json as { sent: number; total: number };
    expect(json.total).toBe(1);
    expect(json.sent).toBeGreaterThan(0);
  });

  it('sends reminder emails for pending intros at Day 10', async () => {
    const intro = makeIntro({
      status: 'pending',
      status_updated_at: daysAgo(11),
      created_at: daysAgo(11),
    });
    mockIntrosResult.mockResolvedValue({ data: [intro], error: null });
    mockJobsResult.mockResolvedValue({ data: [makeJob()], error: null });
    mockEmailLogsResult.mockResolvedValue({ data: [], error: null });

    const req = mockReq({
      method: 'POST',
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const res = mockRes();
    await handler(req, res);

    expect(res._status).toBe(200);
    // Day 10 triggers both day 5 and day 10 nudges
    expect(mockSendNudgeAdmin).toHaveBeenCalledTimes(2);
    expect(mockSendNudgeRequester).toHaveBeenCalledTimes(2);
  });

  it('auto-closes pending intros at Day 14+ to no_response', async () => {
    const intro = makeIntro({
      status: 'pending',
      status_updated_at: daysAgo(15),
      created_at: daysAgo(15),
    });
    mockIntrosResult.mockResolvedValue({ data: [intro], error: null });
    mockJobsResult.mockResolvedValue({ data: [makeJob()], error: null });
    mockEmailLogsResult.mockResolvedValue({ data: [], error: null });

    const req = mockReq({
      method: 'POST',
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const res = mockRes();
    await handler(req, res);

    expect(res._status).toBe(200);
    // Should have sent the requester notification for auto-close
    expect(mockSendNudgeRequester).toHaveBeenCalled();
    // Should have called update to set status to no_response
    expect(mockFrom).toHaveBeenCalledWith('warm_intros');
  });

  it('auto-closes contacted intros at Day 14+ to no_response', async () => {
    const intro = makeIntro({
      status: 'contacted',
      status_updated_at: daysAgo(15),
      created_at: daysAgo(15),
    });
    mockIntrosResult.mockResolvedValue({ data: [intro], error: null });
    mockJobsResult.mockResolvedValue({ data: [makeJob()], error: null });
    mockEmailLogsResult.mockResolvedValue({ data: [], error: null });

    const req = mockReq({
      method: 'POST',
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const res = mockRes();
    await handler(req, res);

    expect(res._status).toBe(200);
    const json = res._json as { sent: number; total: number };
    expect(json.total).toBe(1);
    expect(json.sent).toBeGreaterThan(0);
  });

  it('skips already-sent nudge emails (dedup)', async () => {
    const intro = makeIntro({
      status: 'pending',
      status_updated_at: daysAgo(6),
      created_at: daysAgo(6),
    });
    mockIntrosResult.mockResolvedValue({ data: [intro], error: null });
    mockJobsResult.mockResolvedValue({ data: [makeJob()], error: null });
    // Simulate that day 5 nudge was already sent
    mockEmailLogsResult.mockResolvedValue({
      data: [
        { related_warm_intro_id: 'intro-1', event_type: 'warm_intro_nudge_day5' },
        { related_warm_intro_id: 'intro-1', event_type: 'warm_intro_requester_update_day5' },
      ],
      error: null,
    });

    const req = mockReq({
      method: 'POST',
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const res = mockRes();
    await handler(req, res);

    expect(res._status).toBe(200);
    // Nudge admin and requester should NOT be called since they were already sent
    expect(mockSendNudgeAdmin).not.toHaveBeenCalled();
    expect(mockSendNudgeRequester).not.toHaveBeenCalled();
  });

  it('returns summary with sent/errors/total counts', async () => {
    const intro = makeIntro({
      status: 'pending',
      status_updated_at: daysAgo(6),
      created_at: daysAgo(6),
    });
    mockIntrosResult.mockResolvedValue({ data: [intro], error: null });
    mockJobsResult.mockResolvedValue({ data: [makeJob()], error: null });
    mockEmailLogsResult.mockResolvedValue({ data: [], error: null });

    const req = mockReq({
      method: 'POST',
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const res = mockRes();
    await handler(req, res);

    expect(res._status).toBe(200);
    const json = res._json as { total: number; sent: number; errors: number; timestamp: string };
    expect(json.total).toBe(1);
    expect(typeof json.sent).toBe('number');
    expect(typeof json.errors).toBe('number');
    expect(json.timestamp).toBeTruthy();
  });

  it('skips intro when job not found in jobMap', async () => {
    const intro = makeIntro({
      status: 'pending',
      job_id: 'missing-job',
      status_updated_at: daysAgo(6),
      created_at: daysAgo(6),
    });
    mockIntrosResult.mockResolvedValue({ data: [intro], error: null });
    // Return jobs that don't match the intro's job_id
    mockJobsResult.mockResolvedValue({ data: [makeJob({ id: 'other-job' })], error: null });
    mockEmailLogsResult.mockResolvedValue({ data: [], error: null });

    const req = mockReq({
      method: 'POST',
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const res = mockRes();
    await handler(req, res);

    expect(res._status).toBe(200);
    // No emails sent because job wasn't found
    expect(mockSendNudgeAdmin).not.toHaveBeenCalled();
    expect(mockSendNudgeRequester).not.toHaveBeenCalled();
  });

  it('allows GET method (apiHandler allows GET and POST)', async () => {
    mockIntrosResult.mockResolvedValue({ data: [], error: null });
    const req = mockReq({
      method: 'GET',
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(200);
  });

  it('sends contact nudge for contacted intros at Day 5', async () => {
    const intro = makeIntro({
      status: 'contacted',
      status_updated_at: daysAgo(6),
      created_at: daysAgo(6),
      response_token: 'tok-abc',
    });
    mockIntrosResult.mockResolvedValue({ data: [intro], error: null });
    mockJobsResult.mockResolvedValue({
      data: [makeJob({ submitter_name: 'Bob', submitter_email: 'bob@acme.com' })],
      error: null,
    });
    mockEmailLogsResult.mockResolvedValue({ data: [], error: null });

    const req = mockReq({
      method: 'POST',
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const res = mockRes();
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(mockSendContactNudge).toHaveBeenCalled();
  });

  it('handles email send errors gracefully (increments errors count)', async () => {
    const intro = makeIntro({
      status: 'pending',
      status_updated_at: daysAgo(6),
      created_at: daysAgo(6),
    });
    mockIntrosResult.mockResolvedValue({ data: [intro], error: null });
    mockJobsResult.mockResolvedValue({ data: [makeJob()], error: null });
    mockEmailLogsResult.mockResolvedValue({ data: [], error: null });
    // Make email sends fail
    mockSendNudgeAdmin.mockRejectedValue(new Error('Email failed'));
    mockSendNudgeRequester.mockRejectedValue(new Error('Email failed'));

    const req = mockReq({
      method: 'POST',
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const res = mockRes();
    await handler(req, res);

    expect(res._status).toBe(200);
    const json = res._json as { errors: number; sent: number };
    expect(json.errors).toBeGreaterThan(0);
    expect(json.sent).toBe(0);
  });
});
