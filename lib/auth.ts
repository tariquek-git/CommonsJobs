import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getEnv } from './env.js';

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function createAdminToken(): string {
  const secret = getEnv('ADMIN_TOKEN_SECRET');
  return jwt.sign({ role: 'admin' }, secret, { expiresIn: '8h' });
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

export function extractToken(request: Request): string | null {
  const auth = request.headers.get('authorization');
  if (!auth) return null;
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
}

export function requireAdmin(request: Request): boolean {
  const token = extractToken(request);
  if (!token) return false;
  return verifyAdminToken(token);
}
