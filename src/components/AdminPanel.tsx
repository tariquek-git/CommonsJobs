import { useState, useEffect, useCallback } from 'react';
import { useAdmin } from '../hooks/useAdmin';
import { getAnalytics, getWarmIntros, updateWarmIntroStatus, updateJob } from '../lib/api';
import type { AnalyticsData, WarmIntroRecord } from '../lib/api';
import type { Job } from '../lib/types';
import { getRelativeTimeLabel } from '../lib/date';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function GoogleLoginForm({ onGoogleLogin, loading, error }: {
  onGoogleLogin: (credential: string) => void;
  loading: boolean;
  error: string | null;
}) {
  // Handle the OAuth callback — Google redirects back with id_token in the hash
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('id_token=')) {
      const params = new URLSearchParams(hash.substring(1));
      const idToken = params.get('id_token');
      if (idToken) {
        // Clean the URL
        window.history.replaceState(null, '', window.location.pathname);
        onGoogleLogin(idToken);
      }
    }
  }, [onGoogleLogin]);

  const handleGoogleSignIn = () => {
    const redirectUri = `${window.location.origin}/admin`;
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'id_token');
    authUrl.searchParams.set('scope', 'openid email');
    authUrl.searchParams.set('nonce', crypto.randomUUID());
    window.location.href = authUrl.toString();
  };

  return (
    <div className="max-w-sm mx-auto surface-elevated p-8">
      <div className="text-center mb-6">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 mb-3">
          <svg className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Admin Login</h2>
        <p className="text-sm text-gray-500 mt-1">Sign in with your Google account</p>
      </div>
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {loading ? (
        <div className="text-center text-gray-500 py-4">Signing in...</div>
      ) : !GOOGLE_CLIENT_ID ? (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
          <p className="text-sm text-amber-700">Google Client ID not configured. Set VITE_GOOGLE_CLIENT_ID.</p>
        </div>
      ) : (
        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Sign in with Google
        </button>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    pending: 'badge-pending',
    active: 'badge-active',
    rejected: 'badge-rejected',
    archived: 'badge bg-gray-100 text-gray-500 border border-gray-200',
  };
  return <span className={classes[status] || 'badge'}>{status}</span>;
}

const EDITABLE_FIELDS: { key: keyof Job; label: string; type: 'text' | 'textarea' | 'boolean' | 'tags' }[] = [
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'company', label: 'Company', type: 'text' },
  { key: 'location', label: 'Location', type: 'text' },
  { key: 'country', label: 'Country', type: 'text' },
  { key: 'apply_url', label: 'Apply URL', type: 'text' },
  { key: 'company_url', label: 'Company URL', type: 'text' },
  { key: 'company_logo_url', label: 'Logo URL', type: 'text' },
  { key: 'summary', label: 'Summary', type: 'textarea' },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'warm_intro_ok', label: 'Warm intro OK', type: 'boolean' },
  { key: 'standout_perks', label: 'Standout perks (comma-separated)', type: 'tags' },
  { key: 'tags', label: 'Tags (comma-separated)', type: 'tags' },
  { key: 'expires_at', label: 'Expires at (ISO date)', type: 'text' },
];

function JobRow({ job, token, onStatusChange, onJobUpdated }: {
  job: Job;
  token: string;
  onStatusChange: (id: string, status: string) => void;
  onJobUpdated: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState<Record<string, string | boolean | string[]>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const startEditing = () => {
    const initial: Record<string, string | boolean | string[]> = {};
    for (const field of EDITABLE_FIELDS) {
      const val = job[field.key];
      if (field.type === 'tags') {
        initial[field.key] = (val as string[] || []).join(', ');
      } else if (field.type === 'boolean') {
        initial[field.key] = val as boolean;
      } else {
        initial[field.key] = (val as string) || '';
      }
    }
    setEditing(initial);
    setExpanded(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const updates: Partial<Job> = {};
      for (const field of EDITABLE_FIELDS) {
        const val = editing[field.key];
        if (field.type === 'tags') {
          const arr = (val as string).split(',').map((s: string) => s.trim()).filter(Boolean);
          if (JSON.stringify(arr) !== JSON.stringify(job[field.key])) {
            (updates as Record<string, unknown>)[field.key] = arr;
          }
        } else if (field.type === 'boolean') {
          if (val !== job[field.key]) {
            (updates as Record<string, unknown>)[field.key] = val;
          }
        } else {
          const strVal = (val as string) || null;
          if (strVal !== (job[field.key] || null)) {
            (updates as Record<string, unknown>)[field.key] = strVal;
          }
        }
      }
      if (Object.keys(updates).length > 0) {
        await updateJob(token, job.id, updates);
        onJobUpdated();
      }
      setExpanded(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="surface-elevated overflow-hidden">
      <div className="p-4 flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1 cursor-pointer" onClick={() => expanded ? setExpanded(false) : startEditing()}>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-medium text-gray-900 truncate">{job.title}</h3>
            <StatusBadge status={job.status} />
          </div>
          <p className="text-xs text-gray-500">
            {job.company} · {job.location || 'No location'} · {getRelativeTimeLabel(job.created_at)}
          </p>
          {job.submitter_email && (
            <p className="text-xs text-indigo-600/70 mt-0.5">{job.submitter_email}</p>
          )}
          {job.submission_ref && (
            <p className="text-xs text-gray-400 mt-0.5 font-mono">{job.submission_ref}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => expanded ? setExpanded(false) : startEditing()}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
          >
            {expanded ? 'Close' : 'Edit'}
          </button>
          {job.status !== 'active' && (
            <button
              onClick={() => onStatusChange(job.id, 'active')}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              Approve
            </button>
          )}
          {job.status !== 'rejected' && (
            <button
              onClick={() => onStatusChange(job.id, 'rejected')}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
            >
              Reject
            </button>
          )}
          {job.status !== 'archived' && (
            <button
              onClick={() => onStatusChange(job.id, 'archived')}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              Archive
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4 space-y-3 bg-gray-50/50">
          {saveError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-2">
              <p className="text-xs text-red-700">{saveError}</p>
            </div>
          )}
          {EDITABLE_FIELDS.map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-medium text-gray-500 mb-1">{field.label}</label>
              {field.type === 'boolean' ? (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editing[field.key] as boolean}
                    onChange={(e) => setEditing({ ...editing, [field.key]: e.target.checked })}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-gray-700">{editing[field.key] ? 'Yes' : 'No'}</span>
                </label>
              ) : field.type === 'textarea' ? (
                <textarea
                  value={editing[field.key] as string}
                  onChange={(e) => setEditing({ ...editing, [field.key]: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              ) : (
                <input
                  type="text"
                  value={editing[field.key] as string}
                  onChange={(e) => setEditing({ ...editing, [field.key]: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              )}
            </div>
          ))}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary py-1.5 px-4 text-xs"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={() => setExpanded(false)}
              className="btn-ghost py-1.5 px-4 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple CSS bar chart
function MiniChart({ data, color, label }: { data: { date: string; count: number }[]; color: string; label: string }) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="surface-elevated p-4">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{label}</h4>
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
      <div className="flex justify-between mt-2 text-[10px] text-gray-400">
        <span>{data[0]?.date.slice(5)}</span>
        <span>{data[data.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

function AnalyticsTab({ token }: { token: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setAnalyticsError(null);
    try {
      const result = await getAnalytics(token);
      setData(result);
    } catch (err) {
      setAnalyticsError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return <div className="text-center text-gray-500 py-8">Loading analytics...</div>;
  }

  if (!data) {
    return (
      <div className="surface-elevated p-8 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-50 mb-3">
          <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <p className="text-red-600 font-semibold">Failed to load analytics</p>
        {analyticsError && <p className="text-gray-500 text-sm mt-1">{analyticsError}</p>}
        <button onClick={fetchAnalytics} className="btn-secondary mt-3 text-xs">Try Again</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="surface-elevated p-4">
          <p className="text-xs text-gray-500">Clicks (30d)</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{data.totals.clicks30d}</p>
        </div>
        <div className="surface-elevated p-4">
          <p className="text-xs text-gray-500">Warm Intros (30d)</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{data.totals.intros30d}</p>
        </div>
        <div className="surface-elevated p-4">
          <p className="text-xs text-gray-500">Active Jobs</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{data.statusCounts.active || 0}</p>
        </div>
        <div className="surface-elevated p-4">
          <p className="text-xs text-gray-500">Pending Review</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{data.statusCounts.pending || 0}</p>
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
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Top Jobs by Clicks</h4>
          <div className="space-y-2">
            {data.topJobs.map((job, i) => (
              <div key={job.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-gray-400 w-5 text-right shrink-0">{i + 1}.</span>
                  <span className="text-gray-900 truncate">{job.title}</span>
                  <span className="text-gray-400 text-xs shrink-0">{job.company}</span>
                </div>
                <span className="text-indigo-600 font-semibold tabular-nums shrink-0 ml-3">
                  {job.clicks}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status breakdown */}
      <div className="surface-elevated p-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Jobs by Status</h4>
        <div className="flex gap-4">
          {Object.entries(data.statusCounts).map(([status, count]) => (
            <div key={status} className="flex items-center gap-2 text-sm">
              <StatusBadge status={status} />
              <span className="text-gray-700 font-medium tabular-nums">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const INTRO_STATUSES = ['pending', 'contacted', 'connected', 'no_response'] as const;

function IntroStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border border-amber-200',
    contacted: 'bg-blue-50 text-blue-700 border border-blue-200',
    connected: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    no_response: 'bg-gray-100 text-gray-500 border border-gray-200',
  };
  const labels: Record<string, string> = {
    pending: 'Pending',
    contacted: 'Contacted',
    connected: 'Connected',
    no_response: 'No Response',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] || styles.pending}`}>
      {labels[status] || status}
    </span>
  );
}

function IntroCard({ intro, onStatusChange }: { intro: WarmIntroRecord; onStatusChange: (id: string, status: string) => void }) {
  return (
    <div className="surface-elevated p-4 space-y-3">
      {/* Header: requester + date */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900">{intro.name}</h3>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <a href={`mailto:${intro.email}`} className="text-xs text-indigo-600 hover:underline">{intro.email}</a>
            {intro.linkedin && (
              <a href={intro.linkedin} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                LinkedIn
              </a>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <IntroStatusBadge status={intro.status} />
          <p className="text-[10px] text-gray-400 mt-1">{getRelativeTimeLabel(intro.created_at)}</p>
        </div>
      </div>

      {/* Message */}
      {intro.message && (
        <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 italic">"{intro.message}"</p>
      )}

      {/* Job info */}
      <div className="text-xs text-gray-500 space-y-0.5">
        <p>
          <span className="text-gray-400">Wants intro to:</span>{' '}
          <span className="text-gray-900 font-medium">{intro.job_title}</span> at{' '}
          <span className="text-gray-900 font-medium">{intro.job_company}</span>
        </p>
        {intro.job_submitter_email && (
          <p>
            <span className="text-gray-400">Job posted by:</span>{' '}
            <a href={`mailto:${intro.job_submitter_email}`} className="text-indigo-600 hover:underline">
              {intro.job_submitter_name || intro.job_submitter_email}
            </a>
          </p>
        )}
      </div>

      {/* Status actions */}
      <div className="flex items-center gap-1.5 pt-1 border-t border-gray-100">
        {INTRO_STATUSES.filter((s) => s !== intro.status).map((s) => {
          const labels: Record<string, string> = {
            pending: 'Pending',
            contacted: 'Contacted',
            connected: 'Connected',
            no_response: 'No Response',
          };
          const colors: Record<string, string> = {
            pending: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
            contacted: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
            connected: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
            no_response: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
          };
          return (
            <button
              key={s}
              onClick={() => onStatusChange(intro.id, s)}
              className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors ${colors[s]}`}
            >
              {labels[s]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WarmIntrosTab({ token }: { token: string }) {
  const [intros, setIntros] = useState<WarmIntroRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabError, setTabError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('');

  const fetchIntros = useCallback(async () => {
    setLoading(true);
    setTabError(null);
    try {
      const result = await getWarmIntros(token, filter || undefined);
      setIntros(result.intros);
    } catch (err) {
      setTabError(err instanceof Error ? err.message : 'Failed to load warm intros');
    } finally {
      setLoading(false);
    }
  }, [token, filter]);

  useEffect(() => {
    fetchIntros();
  }, [fetchIntros]);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateWarmIntroStatus(token, id, status);
      setIntros((prev) => prev.map((intro) => (intro.id === id ? { ...intro, status } : intro)));
    } catch (err) {
      setTabError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100/60 p-1">
        {['', 'pending', 'contacted', 'connected', 'no_response'].map((s) => {
          const labels: Record<string, string> = {
            '': 'All',
            pending: 'Pending',
            contacted: 'Contacted',
            connected: 'Connected',
            no_response: 'No Response',
          };
          return (
            <button
              key={s || 'all'}
              onClick={() => setFilter(s)}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                filter === s
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {labels[s]}
            </button>
          );
        })}
      </div>

      {tabError && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{tabError}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-500 py-8">Loading warm intros...</div>
      ) : intros.length === 0 ? (
        <div className="text-center text-gray-500 py-8">No warm intro requests{filter ? ` with status "${filter}"` : ''}.</div>
      ) : (
        <div className="space-y-3">
          {intros.map((intro) => (
            <IntroCard key={intro.id} intro={intro} onStatusChange={handleStatusChange} />
          ))}
        </div>
      )}
    </div>
  );
}

type SortKey = 'newest' | 'oldest' | 'company' | 'title';

function sortJobs(jobs: Job[], sortKey: SortKey): Job[] {
  return [...jobs].sort((a, b) => {
    switch (sortKey) {
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'company':
        return a.company.localeCompare(b.company);
      case 'title':
        return a.title.localeCompare(b.title);
      default:
        return 0;
    }
  });
}

export default function AdminPanel() {
  const {
    token, jobs, runtime, loading, error,
    statusFilter, loginWithGoogle, logout,
    setStatusFilter, changeJobStatus, refreshJobs,
  } = useAdmin();
  const [activeTab, setActiveTab] = useState<'jobs' | 'intros' | 'analytics'>('jobs');
  const [introsKey, setIntrosKey] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>('newest');

  const sortedJobs = sortJobs(jobs, sortKey);

  if (!token) {
    return <GoogleLoginForm onGoogleLogin={loginWithGoogle} loading={loading} error={error} />;
  }

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Admin Panel</h2>
        <div className="flex items-center gap-3">
          {activeTab === 'jobs' && <button onClick={refreshJobs} className="btn-ghost text-xs">Refresh</button>}
          {activeTab === 'intros' && <button onClick={() => setIntrosKey((k) => k + 1)} className="btn-ghost text-xs">Refresh</button>}
          <button onClick={logout} className="btn-ghost text-xs text-red-600">Logout</button>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-xl bg-gray-100/60 p-1">
        {(['jobs', 'intros', 'analytics'] as const).map((tab) => {
          const labels: Record<string, string> = {
            jobs: 'Jobs',
            intros: 'Warm Intros',
            analytics: 'Analytics',
          };
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                activeTab === tab
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      {activeTab === 'analytics' ? (
        <AnalyticsTab token={token} />
      ) : activeTab === 'intros' ? (
        <WarmIntrosTab key={introsKey} token={token} />
      ) : (
        <>
          {/* Runtime info */}
          {runtime && (
            <div className="surface-tinted p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs">Storage</p>
                <p className={runtime.storage.healthy ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
                  {runtime.storage.healthy ? 'Healthy' : 'Unhealthy'}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Jobs</p>
                <p className="text-gray-700 font-medium">{runtime.storage.jobCount}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Clicks</p>
                <p className="text-gray-700 font-medium">{runtime.storage.clickCount}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">AI</p>
                <p className={runtime.ai.configured ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>
                  {runtime.ai.configured ? 'Configured' : 'Not configured'}
                </p>
              </div>
            </div>
          )}

          {/* Status filter + sort */}
          <div className="flex items-center gap-3">
            <div className="flex-1 flex gap-1 rounded-xl bg-gray-100/60 p-1">
              {['pending', 'active', 'rejected', 'archived', ''].map((s) => (
                <button
                  key={s || 'all'}
                  onClick={() => setStatusFilter(s)}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                    statusFilter === s
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {s || 'All'}
                </button>
              ))}
            </div>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="company">Company A–Z</option>
              <option value="title">Title A–Z</option>
            </select>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center text-gray-500 py-8">Loading...</div>
          ) : jobs.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No jobs with this status.</div>
          ) : (
            <div className="space-y-2">
              {sortedJobs.map((job) => (
                <JobRow key={job.id} job={job} token={token} onStatusChange={changeJobStatus} onJobUpdated={refreshJobs} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
