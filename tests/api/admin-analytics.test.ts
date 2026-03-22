import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockReq, mockRes } from './helpers';

// ── Supabase mock ──
// analytics.ts calls Promise.all with 5 queries, then a 6th for top job details.
// We need to track which table/chain is being called and return appropriate data.

const mockClicksResult = vi.fn().mockResolvedValue({ data: [], error: null });
const mockWarmIntrosResult = vi.fn().mockResolvedValue({ data: [], error: null });
const mockJobsByStatusResult = vi.fn().mockResolvedValue({ data: [], error: null });
const mockAllIntrosResult = vi.fn().mockResolvedValue({ data: [], error: null });
const mockRecentEmailsResult = vi.fn().mockResolvedValue({ data: [], error: null });
const mockTopJobsResult = vi.fn().mockResolvedValue({ data: [], error: null });

// Track from() calls to route to the correct mock
let fromCalls: string[] = [];

function makeChainable(terminal: ReturnType<typeof vi.fn>) {
  const createProxy = (): Record<string, unknown> => {
    return new Proxy(
      {},
      {
        get: (_target, prop) => {
          if (prop === 'then') {
            const result = terminal();
            return (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve);
          }
          // Every method call returns a new chainable proxy
          return (..._args: unknown[]) => createProxy();
        },
      },
    );
  };
  return createProxy();
}

const mockFrom = vi.fn().mockImplementation((table: string) => {
  fromCalls.push(table);

  // The handler calls from() in this order inside Promise.all:
  //   1. clicks (getClicksTable()) → clicksResult
  //   2. warm_intros (select created_at) → warmIntrosResult
  //   3. jobs (getJobsTable(), select status) → jobsByStatusResult
  //   4. warm_intros (select status, contact_response) → allIntrosResult
  //   5. email_logs → recentEmailsResult
  // Then optionally:
  //   6. jobs (getJobsTable(), select id,title,company, .in) → topJobsResult

  if (table === 'clicks') {
    return makeChainable(mockClicksResult);
  }
  if (table === 'email_logs') {
    return makeChainable(mockRecentEmailsResult);
  }

  // Distinguish warm_intros calls by count
  if (table === 'warm_intros') {
    const warmIntroCalls = fromCalls.filter((t) => t === 'warm_intros').length;
    if (warmIntroCalls <= 1) {
      return makeChainable(mockWarmIntrosResult);
    }
    return makeChainable(mockAllIntrosResult);
  }

  // Distinguish jobs calls by count
  if (table === 'jobs') {
    const jobsCalls = fromCalls.filter((t) => t === 'jobs').length;
    if (jobsCalls <= 1) {
      return makeChainable(mockJobsByStatusResult);
    }
    return makeChainable(mockTopJobsResult);
  }

  return makeChainable(vi.fn().mockResolvedValue({ data: [], error: null }));
});

vi.mock('../../lib/supabase.js', () => ({
  getSupabase: () => ({ from: mockFrom }),
  getJobsTable: () => 'jobs',
  getClicksTable: () => 'clicks',
}));

vi.mock('../../lib/env.js', () => ({
  getEnv: vi.fn().mockReturnValue(''),
}));

vi.mock('../../lib/rate-limit.js', () => ({
  getClientIP: vi.fn().mockReturnValue('127.0.0.1'),
  rateLimitOrReject: vi.fn().mockResolvedValue(false),
  RATE_LIMITS: {
    adminRead: { windowMs: 60000, maxRequests: 100, name: 'admin-read' },
  },
}));

vi.mock('../../lib/auth.js', () => ({
  requireAdmin: vi.fn().mockReturnValue(true),
}));

vi.mock('../../lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import handler from '../../api/admin/analytics';
import { requireAdmin } from '../../lib/auth.js';

describe('GET /api/admin/analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromCalls = [];
    (requireAdmin as ReturnType<typeof vi.fn>).mockReturnValue(true);
    mockClicksResult.mockResolvedValue({ data: [], error: null });
    mockWarmIntrosResult.mockResolvedValue({ data: [], error: null });
    mockJobsByStatusResult.mockResolvedValue({ data: [], error: null });
    mockAllIntrosResult.mockResolvedValue({ data: [], error: null });
    mockRecentEmailsResult.mockResolvedValue({ data: [], error: null });
    mockTopJobsResult.mockResolvedValue({ data: [], error: null });
  });

  it('rejects non-GET methods (405)', async () => {
    const req = mockReq({ method: 'POST' });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(405);
    expect((res._json as { code: string }).code).toBe('METHOD_NOT_ALLOWED');
  });

  it('rejects unauthenticated requests (401)', async () => {
    (requireAdmin as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(401);
    expect((res._json as { code: string }).code).toBe('UNAUTHORIZED');
  });

  it('returns correct response structure with all fields', async () => {
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(200);

    const json = res._json as Record<string, unknown>;
    expect(json).toHaveProperty('clicksByDay');
    expect(json).toHaveProperty('introsByDay');
    expect(json).toHaveProperty('topJobs');
    expect(json).toHaveProperty('statusCounts');
    expect(json).toHaveProperty('totals');
    expect(json).toHaveProperty('introPipeline');
    expect(json).toHaveProperty('recentEmails');
  });

  it('aggregateByDay fills missing days (30-day range)', async () => {
    // Provide clicks on only 2 specific days
    const day1 = new Date(Date.now() - 5 * 86400000).toISOString();
    const day2 = new Date(Date.now() - 3 * 86400000).toISOString();
    mockClicksResult.mockResolvedValue({
      data: [
        { created_at: day1, job_id: 'j1' },
        { created_at: day1, job_id: 'j1' },
        { created_at: day2, job_id: 'j2' },
      ],
      error: null,
    });

    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(200);

    const json = res._json as { clicksByDay: { date: string; count: number }[] };
    // Should always return exactly 30 days
    expect(json.clicksByDay).toHaveLength(30);
    // Most days should be 0
    const nonZeroDays = json.clicksByDay.filter((d) => d.count > 0);
    expect(nonZeroDays.length).toBe(2);
    // Total clicks should match
    const totalFromDays = json.clicksByDay.reduce((sum, d) => sum + d.count, 0);
    expect(totalFromDays).toBe(3);
  });

  it('topJobs sorted by click count descending', async () => {
    mockClicksResult.mockResolvedValue({
      data: [
        { created_at: new Date().toISOString(), job_id: 'j1' },
        { created_at: new Date().toISOString(), job_id: 'j2' },
        { created_at: new Date().toISOString(), job_id: 'j2' },
        { created_at: new Date().toISOString(), job_id: 'j2' },
        { created_at: new Date().toISOString(), job_id: 'j1' },
      ],
      error: null,
    });
    mockTopJobsResult.mockResolvedValue({
      data: [
        { id: 'j1', title: 'Dev', company: 'A' },
        { id: 'j2', title: 'PM', company: 'B' },
      ],
      error: null,
    });

    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(200);

    const json = res._json as {
      topJobs: { id: string; title: string; company: string; clicks: number }[];
    };
    expect(json.topJobs.length).toBe(2);
    // j2 has 3 clicks, j1 has 2 — so j2 should be first
    expect(json.topJobs[0].id).toBe('j2');
    expect(json.topJobs[0].clicks).toBe(3);
    expect(json.topJobs[1].id).toBe('j1');
    expect(json.topJobs[1].clicks).toBe(2);
  });

  it('statusCounts counts jobs per status', async () => {
    mockJobsByStatusResult.mockResolvedValue({
      data: [
        { status: 'active' },
        { status: 'active' },
        { status: 'pending' },
        { status: 'expired' },
        { status: 'active' },
      ],
      error: null,
    });

    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(200);

    const json = res._json as { statusCounts: Record<string, number> };
    expect(json.statusCounts.active).toBe(3);
    expect(json.statusCounts.pending).toBe(1);
    expect(json.statusCounts.expired).toBe(1);
  });

  it('introPipeline includes connectionRate calculation', async () => {
    mockAllIntrosResult.mockResolvedValue({
      data: [
        { status: 'pending', contact_response: null },
        { status: 'contacted', contact_response: null },
        { status: 'connected', contact_response: 'accepted' },
        { status: 'connected', contact_response: 'accepted' },
        { status: 'declined', contact_response: 'declined' },
      ],
      error: null,
    });

    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(200);

    const json = res._json as {
      introPipeline: {
        pending: number;
        contacted: number;
        connected: number;
        declined: number;
        total: number;
        connectionRate: number;
        contactResponses: Record<string, number>;
      };
    };
    expect(json.introPipeline.pending).toBe(1);
    expect(json.introPipeline.contacted).toBe(1);
    expect(json.introPipeline.connected).toBe(2);
    expect(json.introPipeline.declined).toBe(1);
    expect(json.introPipeline.total).toBe(5);
    // connectionRate = round(2/5 * 100) = 40
    expect(json.introPipeline.connectionRate).toBe(40);
    expect(json.introPipeline.contactResponses.accepted).toBe(2);
    expect(json.introPipeline.contactResponses.declined).toBe(1);
  });

  it('returns zero counts with empty data', async () => {
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(200);

    const json = res._json as {
      totals: { clicks30d: number; intros30d: number };
      topJobs: unknown[];
      statusCounts: Record<string, number>;
      introPipeline: { total: number; connectionRate: number };
      recentEmails: unknown[];
    };
    expect(json.totals.clicks30d).toBe(0);
    expect(json.totals.intros30d).toBe(0);
    expect(json.topJobs).toHaveLength(0);
    expect(Object.keys(json.statusCounts)).toHaveLength(0);
    expect(json.introPipeline.total).toBe(0);
    expect(json.introPipeline.connectionRate).toBe(0);
    expect(json.recentEmails).toHaveLength(0);
  });

  it('returns 500 on database error', async () => {
    // Make the first query (clicks) throw to trigger catch block
    mockClicksResult.mockImplementation(() => {
      throw new Error('DB connection failed');
    });

    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(500);
    expect((res._json as { code: string }).code).toBe('INTERNAL_ERROR');
  });

  it('sets cache-control header', async () => {
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(res._headers['Cache-Control']).toBe('s-maxage=300, stale-while-revalidate=600');
  });

  it('introsByDay fills 30 days with warm intro data', async () => {
    const recentDay = new Date(Date.now() - 2 * 86400000).toISOString();
    mockWarmIntrosResult.mockResolvedValue({
      data: [{ created_at: recentDay }],
      error: null,
    });

    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(200);

    const json = res._json as { introsByDay: { date: string; count: number }[] };
    expect(json.introsByDay).toHaveLength(30);
    const nonZero = json.introsByDay.filter((d) => d.count > 0);
    expect(nonZero.length).toBe(1);
    expect(nonZero[0].count).toBe(1);
  });

  it('recentEmails maps email_logs fields correctly', async () => {
    mockRecentEmailsResult.mockResolvedValue({
      data: [
        {
          event_type: 'warm_intro_request',
          recipient: 'alice@test.com',
          subject: 'New intro',
          status: 'sent',
          created_at: '2025-01-15T10:00:00Z',
          related_job_id: 'j1',
          related_warm_intro_id: 'i1',
        },
      ],
      error: null,
    });

    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(200);

    const json = res._json as {
      recentEmails: {
        event_type: string;
        recipient: string;
        subject: string;
        status: string;
        created_at: string;
        job_id: string;
        intro_id: string;
      }[];
    };
    expect(json.recentEmails).toHaveLength(1);
    expect(json.recentEmails[0].event_type).toBe('warm_intro_request');
    expect(json.recentEmails[0].recipient).toBe('alice@test.com');
    expect(json.recentEmails[0].job_id).toBe('j1');
    expect(json.recentEmails[0].intro_id).toBe('i1');
  });
});
