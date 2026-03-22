import { useState, useCallback, useRef, createContext, useContext } from 'react';
import { adminLogin, adminLogout } from '../lib/api';

interface AdminAuthContext {
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AdminAuthContext | null>(null);

export function useAdminAuth(): AdminAuthContext {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAdminAuth must be inside AdminAuthProvider');
  return ctx;
}

export function useAdminAuthProvider(): AdminAuthContext {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('admin_token');
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const { token: newToken } = await adminLogin({ username, password });
      setToken(newToken);
      sessionStorage.setItem('admin_token', newToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const tokenRef = useRef(token);
  tokenRef.current = token;

  const logout = useCallback(() => {
    // Revoke token server-side (best-effort)
    if (tokenRef.current) adminLogout(tokenRef.current);
    setToken(null);
    sessionStorage.removeItem('admin_token');
  }, []);

  return { token, loading, error, login, logout };
}

export { AuthContext };
