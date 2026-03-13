import { getEnv } from './env.js';

export function getCorsHeaders(request: Request): Record<string, string> {
  const origins = getEnv('CLIENT_ORIGIN', 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim());

  const requestOrigin = request.headers.get('origin') || '';
  const allowedOrigin = origins.includes(requestOrigin) ? requestOrigin : origins[0];

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
