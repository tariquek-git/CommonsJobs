import type { VercelRequest, VercelResponse } from '@vercel/node';
import { vi } from 'vitest';

interface MockReqOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  query?: Record<string, string>;
}

export function mockReq(options: MockReqOptions = {}): VercelRequest {
  return {
    method: options.method || 'POST',
    body: options.body || {},
    headers: options.headers || {},
    query: options.query || {},
  } as unknown as VercelRequest;
}

export function mockRes() {
  const res = {
    _status: 0,
    _json: null as unknown,
    _body: null as unknown,
    _headers: {} as Record<string, string>,
    status(code: number) {
      res._status = code;
      return res;
    },
    json(data: unknown) {
      res._json = data;
      return res;
    },
    send(data: unknown) {
      res._body = data;
      return res;
    },
    setHeader(key: string, value: string) {
      res._headers[key] = value;
      return res;
    },
  };
  return res as unknown as VercelResponse & {
    _status: number;
    _json: unknown;
    _body: unknown;
    _headers: Record<string, string>;
  };
}

/** Create a mock Supabase client with configurable responses */
export function mockSupabase(
  overrides: {
    insertResult?: { error: unknown };
    selectResult?: { data: unknown; error: unknown };
    fromChain?: Record<string, unknown>;
  } = {},
) {
  const chain: Record<string, unknown> = {
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi
          .fn()
          .mockResolvedValue(overrides.insertResult || { data: { id: 'mock-id' }, error: null }),
      }),
      ...(overrides.insertResult || { error: null }),
    }),
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(overrides.selectResult || { data: null, error: null }),
      }),
    }),
    ...overrides.fromChain,
  };

  return {
    from: vi.fn().mockReturnValue(chain),
  };
}
