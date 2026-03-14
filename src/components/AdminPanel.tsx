import { useState, useEffect, useCallback } from 'react';
import { useAdmin } from '../hooks/useAdmin';
import { getAnalytics } from '../lib/api';
import type { AnalyticsData } from '../lib/api';
import type { Job } from '../lib/types';
import { getRelativeTimeLabel } from '../lib/date';

function LoginForm({ onLogin, loading, error }: {
  onLogin: (u: string, p: string) => void;
  loading: boolean;
  error: string | null;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="max-w-sm mx-auto surface-elevated p-8">
      <div className="text-center mb-6">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/20 mb-3">
          <svg className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Admin Login</h2>
      </div>
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 p-3 mb-4">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onLogin(username, password);
        }}
        className="space-y-4"
      >
        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="input-field" autoComplete="username" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="input-field" autoComplete="current-password" />
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    pending: 'badge-pending',
    active: 'badge-active',
    rejected: 'badge-rejected',
    archived: 'badge bg-gray-100 dark:bg-navy-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-navy-700/50',
  };
  return <span className={classes[status] || 'badge'}>{status}</span>;
}

function JobRow({ job, onStatusChange }: { job: Job; onStatusChange: (id: string, status: string) => void }) {
  return (
    <div className="surface-elevated p-4 flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{job.title}</h3>
          <StatusBadge status={job.status} />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {job.company} · {job.location || 'No location'} · {getRelativeTimeLabel(job.created_at)}
        </p>
        {job.submitter_email && (
          <p className="text-xs text-indigo-600/70 dark:text-indigo-400/60 mt-0.5">{job.submitter_email}</p>
        )}
        {job.submission_ref && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-mono">{job.submission_ref}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {job.status !== 'active' && (
          <button
            onClick={() => onStatusChange(job.id, 'active')}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
          >
            Approve
          </button>
        )}
        {job.status !== 'rejected' && (
          <button
            onClick={() => onStatusChange(job.id, 'rejected')}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            Reject
          </button>
        )}
        {job.status !== 'archived' && (
          <button
            onClick={() => onStatusChange(job.id, 'archived')}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-navy-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-navy-700 transition-colors"
          >
            Archive
          </button>
        )}
      </div>
    </div>
  );
}

// Simple CSS bar chart
function MiniChart({ data, color, label }: { data: { date: string; count: number }[]; color: string; label: string }) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="surface-elevated p-4">
      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">{label}</h4>
      <div className="flex items-end gap-[2px] h-24">
        {data.map((d) => (
          <div
            key={d.date}
            className="flex-1 rounded-t-sm transition-all duration-300"
            style={{
              height: `${Math.max((d.count / max) * 100, d.count > 0 ? 8 : 2)}%`,
              backgroundColor: d.count > 0 ? color : 'rgb(229 231 235)',
            }}
            title={`${d.date}: ${d.count}`}
          />
        ))}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-gray-400 dark:text-gray-500">
        <span>{data[0]?.date.slice(5)}</span>
        <span>{data[data.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

function AnalyticsTab({ token }: { token: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAnalytics(token);
      setData(result);
    } catch {
      // Silently fail — non-critical
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return <div className="text-center text-gray-500 dark:text-gray-400 py-8">Loading analytics...</div>;
  }

  if (!data) {
    return <div className="text-center text-gray-500 dark:text-gray-400 py-8">Failed to load analytics.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="surface-elevated p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Clicks (30d)</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{data.totals.clicks30d}</p>
        </div>
        <div className="surface-elevated p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Warm Intros (30d)</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{data.totals.intros30d}</p>
        </div>
        <div className="surface-elevated p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Active Jobs</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{data.statusCounts.active || 0}</p>
        </div>
        <div className="surface-elevated p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Pending Review</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{data.statusCounts.pending || 0}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MiniChart data={data.clicksByDay} color="rgb(99 102 241)" label="Apply Clicks — Last 30 Days" />
        <MiniChart data={data.introsByDay} color="rgb(16 185 129)" label="Warm Intros — Last 30 Days" />
      </div>

      {/* Top jobs */}
      {data.topJobs.length > 0 && (
        <div className="surface-elevated p-4">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Top Jobs by Clicks</h4>
          <div className="space-y-2">
            {data.topJobs.map((job, i) => (
              <div key={job.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-gray-400 dark:text-gray-500 w-5 text-right shrink-0">{i + 1}.</span>
                  <span className="text-gray-900 dark:text-gray-100 truncate">{job.title}</span>
                  <span className="text-gray-400 dark:text-gray-500 text-xs shrink-0">{job.company}</span>
                </div>
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold tabular-nums shrink-0 ml-3">
                  {job.clicks}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status breakdown */}
      <div className="surface-elevated p-4">
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Jobs by Status</h4>
        <div className="flex gap-4">
          {Object.entries(data.statusCounts).map(([status, count]) => (
            <div key={status} className="flex items-center gap-2 text-sm">
              <StatusBadge status={status} />
              <span className="text-gray-700 dark:text-gray-300 font-medium tabular-nums">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const {
    token, jobs, runtime, loading, error,
    statusFilter, login, logout,
    setStatusFilter, changeJobStatus, refreshJobs,
  } = useAdmin();
  const [activeTab, setActiveTab] = useState<'jobs' | 'analytics'>('jobs');

  if (!token) {
    return <LoginForm onLogin={login} loading={loading} error={error} />;
  }

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Admin Panel</h2>
        <div className="flex items-center gap-3">
          {activeTab === 'jobs' && <button onClick={refreshJobs} className="btn-ghost text-xs">Refresh</button>}
          <button onClick={logout} className="btn-ghost text-xs text-red-600 dark:text-red-400">Logout</button>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-xl bg-gray-100/60 dark:bg-navy-900/60 p-1">
        {(['jobs', 'analytics'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all capitalize ${
              activeTab === tab
                ? 'bg-white dark:bg-navy-800 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            {tab === 'jobs' ? 'Job Management' : 'Analytics'}
          </button>
        ))}
      </div>

      {activeTab === 'analytics' ? (
        <AnalyticsTab token={token} />
      ) : (
        <>
          {/* Runtime info */}
          {runtime && (
            <div className="surface-tinted p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Storage</p>
                <p className={runtime.storage.healthy ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-red-600 dark:text-red-400 font-medium'}>
                  {runtime.storage.healthy ? 'Healthy' : 'Unhealthy'}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Jobs</p>
                <p className="text-gray-700 dark:text-gray-300 font-medium">{runtime.storage.jobCount}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Clicks</p>
                <p className="text-gray-700 dark:text-gray-300 font-medium">{runtime.storage.clickCount}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">AI</p>
                <p className={runtime.ai.configured ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-amber-600 dark:text-amber-400 font-medium'}>
                  {runtime.ai.configured ? 'Configured' : 'Not configured'}
                </p>
              </div>
            </div>
          )}

          {/* Status filter tabs */}
          <div className="flex gap-1 rounded-xl bg-gray-100/60 dark:bg-navy-900/60 p-1">
            {['pending', 'active', 'rejected', 'archived', ''].map((s) => (
              <button
                key={s || 'all'}
                onClick={() => setStatusFilter(s)}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                  statusFilter === s
                    ? 'bg-white dark:bg-navy-800 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                {s || 'All'}
              </button>
            ))}
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 p-3">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">Loading...</div>
          ) : jobs.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">No jobs with this status.</div>
          ) : (
            <div className="space-y-2">
              {jobs.map((job) => (
                <JobRow key={job.id} job={job} onStatusChange={changeJobStatus} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
