import type { APIError } from '../shared/types.js';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export function json(data: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

export function errorResponse(error: string, code: string, status: number, extraHeaders?: Record<string, string>): Response {
  const body: APIError = { error, code };
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

export function methodNotAllowed(corsHeaders: Record<string, string>): Response {
  return errorResponse('Method not allowed', 'METHOD_NOT_ALLOWED', 405, corsHeaders);
}

export function badRequest(message: string, corsHeaders: Record<string, string>): Response {
  return errorResponse(message, 'BAD_REQUEST', 400, corsHeaders);
}

export function unauthorized(corsHeaders: Record<string, string>): Response {
  return errorResponse('Unauthorized', 'UNAUTHORIZED', 401, corsHeaders);
}

export function notFound(corsHeaders: Record<string, string>): Response {
  return errorResponse('Not found', 'NOT_FOUND', 404, corsHeaders);
}

export function rateLimited(corsHeaders: Record<string, string>): Response {
  return errorResponse('Too many requests', 'RATE_LIMITED', 429, corsHeaders);
}

export function serverError(message: string, corsHeaders: Record<string, string>): Response {
  return errorResponse(message || 'Internal server error', 'INTERNAL_ERROR', 500, corsHeaders);
}
