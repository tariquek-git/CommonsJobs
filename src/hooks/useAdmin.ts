import { useState, useCallback, useEffect } from 'react';
import { adminLogin, getAdminJobs, updateJobStatus, getRuntime } from '../lib/api';
import type { Job, RuntimeInfo } from '../lib/types';

interface UseAdminReturn {
  token: string | null;
  jobs: Job[];
  runtime: RuntimeInfo | null;
  loading: boolean;
  error: string | null;
  statusFilter: string;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  setStatusFilter: (status: string) => void;
  changeJobStatus: (jobId: string, status: string) => Promise<void>;
  refreshJobs: () => void;
}

export function useAdmin(): UseAdminReturn {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('admin_token');
    } catch {
      return null;
    }
  });
  const [jobs, setJobs] = useState<Job[]>([]);
  const [runtime, setRuntime] = useState<RuntimeInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('pending');

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

  const logout = useCallback(() => {
    setToken(null);
    sessionStorage.removeItem('admin_token');
    setJobs([]);
    setRuntime(null);
  }, []);

  const fetchJobs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const result = await getAdminJobs(token, statusFilter || undefined);
      setJobs(result.jobs);
    } catch (err) {
      if (err instanceof Error && err.message.includes('Unauthorized')) {
        logout();
      }
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, logout]);

  const fetchRuntime = useCallback(async () => {
    if (!token) return;
    try {
      const info = await getRuntime(token);
      setRuntime(info);
    } catch {
      // Non-critical
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchJobs();
      fetchRuntime();
    }
  }, [token, fetchJobs, fetchRuntime]);

  const changeJobStatus = useCallback(
    async (jobId: string, status: string) => {
      if (!token) return;
      try {
        await updateJobStatus(token, jobId, status);
        fetchJobs();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update status');
      }
    },
    [token, fetchJobs],
  );

  return {
    token,
    jobs,
    runtime,
    loading,
    error,
    statusFilter,
    login,
    logout,
    setStatusFilter,
    changeJobStatus,
    refreshJobs: fetchJobs,
  };
}
