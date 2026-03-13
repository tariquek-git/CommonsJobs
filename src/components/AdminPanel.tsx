import { useState } from 'react';
import { useAdmin } from '../hooks/useAdmin';
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
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent-50 dark:bg-accent-900/20 mb-3">
          <svg className="h-6 w-6 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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
          <p className="text-xs text-accent-600/70 dark:text-accent-400/60 mt-0.5">{job.submitter_email}</p>
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

export default function AdminPanel() {
  const {
    token, jobs, runtime, loading, error,
    statusFilter, login, logout,
    setStatusFilter, changeJobStatus, refreshJobs,
  } = useAdmin();

  if (!token) {
    return <LoginForm onLogin={login} loading={loading} error={error} />;
  }

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Admin Panel</h2>
        <div className="flex items-center gap-3">
          <button onClick={refreshJobs} className="btn-ghost text-xs">Refresh</button>
          <button onClick={logout} className="btn-ghost text-xs text-red-600 dark:text-red-400">Logout</button>
        </div>
      </div>

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
    </div>
  );
}
