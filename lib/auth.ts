import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { getEnv } from './env.js';

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ─── JWT Token Revocation ───
// In-memory blocklist for revoked token IDs (jti).
// Entries auto-expire after 2h (matches token TTL).
// For multi-instance deployments, upgrade to Redis-backed blocklist.

const revokedTokens = new Map<string, number>(); // jti -> expiry timestamp
const REVOCATION_CLEANUP_MS = 5 * 60 * 1000;
let lastRevocationCleanup = Date.now();

function cleanupRevoked() {
  const now = Date.now();
  if (now - lastRevocationCleanup < REVOCATION_CLEANUP_MS) return;
  lastRevocationCleanup = now;
  for (const [jti, expiry] of revokedTokens) {
    if (now > expiry) revokedTokens.delete(jti);
  }
}

export function revokeToken(jti: string): void {
  // Keep for 2h (max token lifetime) then auto-cleanup
  revokedTokens.set(jti, Date.now() + 2 * 60 * 60 * 1000);
}

export function isTokenRevoked(jti: string): boolean {
  cleanupRevoked();
  return revokedTokens.has(jti);
}

// ─── Token Creation & Verification ───

export function createAdminToken(): string {
  const secret = getEnv('ADMIN_TOKEN_SECRET');
  const jti = randomUUID();
  return jwt.sign({ role: 'admin', jti }, secret, { expiresIn: '2h' });
}

export function verifyAdminToken(token: string): boolean {
  try {
    const secret = getEnv('ADMIN_TOKEN_SECRET');
    const decoded = jwt.verify(token, secret) as { role: string; jti?: string };
    if (decoded.role !== 'admin') return false;
    // Check revocation if token has a jti
    if (decoded.jti && isTokenRevoked(decoded.jti)) return false;
    return true;
  } catch {
    return false;
  }
}

/** Extract the jti from a token without full verification (for logout/revoke) */
export function extractJti(token: string): string | null {
  try {
    const decoded = jwt.decode(token) as { jti?: string } | null;
    return decoded?.jti || null;
  } catch {
    return null;
  }
}

export function extractToken(
  request: Request | { headers: Record<string, string | string[] | undefined> },
): string | null {
  let auth: string | undefined;
  if ('get' in request.headers && typeof request.headers.get === 'function') {
    auth = request.headers.get('authorization') ?? undefined;
  } else {
    const val = (request.headers as Record<string, string | string[] | undefined>)['authorization'];
    auth = Array.isArray(val) ? val[0] : val;
  }
  if (!auth) return null;
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
}

export function requireAdmin(
  request: Request | { headers: Record<string, string | string[] | undefined> },
): boolean {
  const token = extractToken(request);
  if (!token) return false;
  return verifyAdminToken(token);
}
