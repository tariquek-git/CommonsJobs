import { getEnv } from './env.js';

function getHeader(
  request: Request | { headers: Record<string, string | string[] | undefined> },
  name: string,
): string {
  if ('get' in request.headers && typeof request.headers.get === 'function') {
    return request.headers.get(name) || '';
  }
  const val = (request.headers as Record<string, string | string[] | undefined>)[name];
  return (Array.isArray(val) ? val[0] : val) || '';
}

export function getCorsHeaders(
  request: Request | { headers: Record<string, string | string[] | undefined> },
): Record<string, string> {
  const origins = getEnv('CLIENT_ORIGIN', 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim());

  const requestOrigin = getHeader(request, 'origin');
  const allowedOrigin = origins.includes(requestOrigin) ? requestOrigin : '';

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export function handleCors(request: Request): Response | null {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(request),
    });
  }
  return null;
}
