import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockReq, mockRes } from './helpers';

// ── Mock AI functions ──
const mockHumanizeJobPost = vi.fn().mockResolvedValue({
  fallback: false,
  result: {
    humanized_description: 'A well-crafted summary of the position.',
    standout_perks: ['4-day week', 'Equity'],
  },
});

const mockScrapeAndExtract = vi.fn().mockResolvedValue({
  fallback: false,
  result: {
    title: 'Product Manager',
    company: 'TechCorp',
    description: 'An exciting PM role in fintech.',
    location: 'New York, NY',
  },
});

vi.mock('../../lib/ai.js', () => ({
  humanizeJobPost: (...args: unknown[]) => mockHumanizeJobPost(...args),
  scrapeAndExtract: (...args: unknown[]) => mockScrapeAndExtract(...args),
}));

vi.mock('../../lib/rate-limit.js', () => ({
  getClientIP: vi.fn().mockReturnValue('127.0.0.1'),
  rateLimitOrReject: vi.fn().mockReturnValue(false),
  RATE_LIMITS: {
    aiScrape: { limit: 10, windowMs: 60000 },
  },
}));

vi.mock('../../lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../../lib/env.js', () => ({
  getEnv: () => '',
  validateEnv: () => {},
}));

// Mock global fetch for scrape-url
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import generateSummaryHandler from '../../api/ai/generate-summary';
import scrapeUrlHandler from '../../api/ai/scrape-url';
import { rateLimitOrReject } from '../../lib/rate-limit.js';

// ═══════════════════════════════════════════════════════════
// POST /api/ai/generate-summary
// ═══════════════════════════════════════════════════════════
describe('POST /api/ai/generate-summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHumanizeJobPost.mockResolvedValue({
      fallback: false,
      result: {
        humanized_description: 'A well-crafted summary of the position.',
        standout_perks: ['4-day week', 'Equity'],
      },
    });
  });

  it('rejects non-POST methods', async () => {
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await generateSummaryHandler(req, res);
    expect(res._status).toBe(405);
    expect((res._json as { code: string }).code).toBe('METHOD_NOT_ALLOWED');
  });

  it('returns 200 with summary on valid request', async () => {
    const req = mockReq({
      body: {
        description:
          'A full-stack engineering role building fintech products for enterprise clients with excellent benefits.',
        title: 'Full-Stack Engineer',
      },
    });
    const res = mockRes();
    await generateSummaryHandler(req, res);
    expect(res._status).toBe(200);
    const json = res._json as { fallback: boolean; result: { humanized_description: string } };
    expect(json.fallback).toBe(false);
    expect(json.result.humanized_description).toBeTruthy();
    expect(mockHumanizeJobPost).toHaveBeenCalledWith(
      expect.any(String),
      'Full-Stack Engineer',
      undefined,
    );
  });

  it('returns 400 when description is missing', async () => {
    const req = mockReq({
      body: { title: 'Engineer' },
    });
    const res = mockRes();
    await generateSummaryHandler(req, res);
    expect(res._status).toBe(400);
    expect((res._json as { code: string }).code).toBe('BAD_REQUEST');
  });

  it('returns 400 when description is too short (< 20 chars)', async () => {
    const req = mockReq({
      body: { description: 'Short desc', title: 'Eng' },
    });
    const res = mockRes();
    await generateSummaryHandler(req, res);
    expect(res._status).toBe(400);
    expect((res._json as { error: string }).error).toContain('at least 20 characters');
  });

  it('returns cached result on dedup (same request within 5s)', async () => {
    const body = {
      description: 'A unique description that is long enough to pass the validation check here.',
      title: 'Dedup Test Title',
    };

    const req1 = mockReq({ body });
    const res1 = mockRes();
    await generateSummaryHandler(req1, res1);
    expect(res1._status).toBe(200);
    expect(mockHumanizeJobPost).toHaveBeenCalledTimes(1);

    // Second identical request should return cached result
    const req2 = mockReq({ body });
    const res2 = mockRes();
    await generateSummaryHandler(req2, res2);
    expect(res2._status).toBe(200);
    // AI should NOT be called again
    expect(mockHumanizeJobPost).toHaveBeenCalledTimes(1);
  });

  it('returns 502 fallback when AI throws', async () => {
    mockHumanizeJobPost.mockRejectedValueOnce(new Error('API timeout'));
    const req = mockReq({
      body: {
        description:
          'A valid description that should trigger the AI but it will fail this time around.',
        title: 'Fallback Test',
      },
    });
    const res = mockRes();
    await generateSummaryHandler(req, res);
    expect(res._status).toBe(502);
    const json = res._json as { code: string; fallback: boolean };
    expect(json.code).toBe('AI_ERROR');
    expect(json.fallback).toBe(true);
  });

  it('handles rate limiting', async () => {
    (rateLimitOrReject as ReturnType<typeof vi.fn>).mockReturnValueOnce(true);
    const req = mockReq({
      body: { description: 'Some description content here.', title: 'Test' },
    });
    const res = mockRes();
    await generateSummaryHandler(req, res);
    // Handler returns early; status not set by handler
    expect(res._status).toBe(0);
    expect(mockHumanizeJobPost).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════
// POST /api/ai/scrape-url
// ═══════════════════════════════════════════════════════════
describe('POST /api/ai/scrape-url', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockScrapeAndExtract.mockResolvedValue({
      fallback: false,
      result: {
        title: 'Product Manager',
        company: 'TechCorp',
        description: 'An exciting PM role.',
        location: 'New York, NY',
      },
    });
    // Default: successful HTML fetch
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () =>
        Promise.resolve(
          '<html><body>' +
            '<h1>Product Manager at TechCorp</h1>' +
            '<div>A long job description with enough content to pass the usable content check. '.repeat(
              20,
            ) +
            '</div></body></html>',
        ),
    });
  });

  it('rejects non-POST methods', async () => {
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await scrapeUrlHandler(req, res);
    expect(res._status).toBe(405);
    expect((res._json as { code: string }).code).toBe('METHOD_NOT_ALLOWED');
  });

  it('returns 400 when URL is missing', async () => {
    const req = mockReq({ body: {} });
    const res = mockRes();
    await scrapeUrlHandler(req, res);
    expect(res._status).toBe(400);
    expect((res._json as { code: string }).code).toBe('BAD_REQUEST');
  });

  it('returns 400 for invalid URL format', async () => {
    const req = mockReq({ body: { url: 'not-a-url' } });
    const res = mockRes();
    await scrapeUrlHandler(req, res);
    expect(res._status).toBe(400);
    expect((res._json as { code: string }).code).toBe('BAD_REQUEST');
  });

  it('returns 400 for non-HTTP protocol', async () => {
    const req = mockReq({ body: { url: 'ftp://files.example.com/job.txt' } });
    const res = mockRes();
    await scrapeUrlHandler(req, res);
    expect(res._status).toBe(400);
    expect((res._json as { error: string }).error).toContain('HTTP or HTTPS');
  });

  it('blocks private IP (SSRF protection) — localhost', async () => {
    const req = mockReq({ body: { url: 'http://localhost:3000/admin' } });
    const res = mockRes();
    await scrapeUrlHandler(req, res);
    expect(res._status).toBe(400);
    expect((res._json as { error: string }).error).toContain('not allowed');
  });

  it('blocks private IP (SSRF protection) — 10.x.x.x', async () => {
    const req = mockReq({ body: { url: 'http://10.0.0.1/internal' } });
    const res = mockRes();
    await scrapeUrlHandler(req, res);
    expect(res._status).toBe(400);
  });

  it('blocks private IP (SSRF protection) — 192.168.x.x', async () => {
    const req = mockReq({ body: { url: 'http://192.168.1.1/admin' } });
    const res = mockRes();
    await scrapeUrlHandler(req, res);
    expect(res._status).toBe(400);
  });

  it('blocks private IP (SSRF protection) — 169.254 link-local', async () => {
    const req = mockReq({ body: { url: 'http://169.254.169.254/latest/meta-data/' } });
    const res = mockRes();
    await scrapeUrlHandler(req, res);
    expect(res._status).toBe(400);
  });

  it('returns job data for valid URL', async () => {
    const req = mockReq({ body: { url: 'https://careers.example.com/jobs/123' } });
    const res = mockRes();
    await scrapeUrlHandler(req, res);
    expect(res._status).toBe(200);
    const json = res._json as { result: { title: string }; fallback: boolean };
    expect(json.result.title).toBe('Product Manager');
    expect(json.fallback).toBe(false);
  });

  it('handles rate limiting', async () => {
    (rateLimitOrReject as ReturnType<typeof vi.fn>).mockReturnValueOnce(true);
    const req = mockReq({ body: { url: 'https://example.com/job' } });
    const res = mockRes();
    await scrapeUrlHandler(req, res);
    expect(res._status).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns 502 when all fetch strategies fail', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      text: () => Promise.resolve(''),
    });
    const req = mockReq({ body: { url: 'https://blocked-site.example.com/job/1' } });
    const res = mockRes();
    await scrapeUrlHandler(req, res);
    expect(res._status).toBe(502);
    const json = res._json as { code: string; fallback: boolean };
    expect(json.code).toBe('UPSTREAM_ERROR');
    expect(json.fallback).toBe(true);
  });

  it('returns 502 when AI extraction throws', async () => {
    mockScrapeAndExtract.mockRejectedValueOnce(new Error('AI failure'));
    const req = mockReq({ body: { url: 'https://careers.example.com/jobs/456' } });
    const res = mockRes();
    await scrapeUrlHandler(req, res);
    expect(res._status).toBe(502);
    const json = res._json as { code: string; fallback: boolean };
    expect(json.code).toBe('AI_ERROR');
    expect(json.fallback).toBe(true);
  });
});
