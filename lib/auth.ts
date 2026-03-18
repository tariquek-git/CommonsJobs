import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getEnv } from './env.js';

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function createAdminToken(): string {
  const secret = getEnv('ADMIN_TOKEN_SECRET');
  return jwt.sign({ role: 'admin' }, secret, { expiresIn: '2h' });
}

export function verifyAdminToken(token: string): boolean {
  try {
    const secret = getEnv('ADMIN_TOKEN_SECRET');
    const decoded = jwt.verify(token, secret) as { role: string };
    return decoded.role === 'admin';
  } catch {
    return false;
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
