import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { getWarmIntros, updateWarmIntroStatus } from '../../lib/api';
import type { WarmIntroRecord } from '../../lib/api';
import { getRelativeTimeLabel } from '../../lib/date';

const STATUSES = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'connected', label: 'Connected' },
  { value: 'no_response', label: 'No Response' },
] as const;

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  contacted: 'bg-blue-50 text-blue-700 border-blue-200',
  connected: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  no_response: 'bg-gray-100 text-gray-500 border-gray-200',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  contacted: 'Contacted',
  connected: 'Connected',
  no_response: 'No Response',
};

const STATUS_ACTION_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
  contacted: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
  connected: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  no_response: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
};

export default function IntrosPage() {
  const { token } = useAdminAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = searchParams.get('status') || '';

  const [intros, setIntros] = useState<WarmIntroRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIntros = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getWarmIntros(token, filter || undefined);
      setIntros(result.intros);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load warm intros');
    } finally {
      setLoading(false);
    }
  }, [token, filter]);

  useEffect(() => {
    fetchIntros();
  }, [fetchIntros]);

  useEffect(() => {
    document.title = 'Warm Intros | Admin';
  }, []);

  const handleStatusChange = async (id: string, status: string) => {
    if (!token) return;
    try {
      await updateWarmIntroStatus(token, id, status);
      setIntros((prev) => prev.map((intro) => (intro.id === id ? { ...intro, status } : intro)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Warm Intros</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage intro requests</p>
        </div>
        <button
          onClick={fetchIntros}
          className="text-xs px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
        {STATUSES.map((s) => (
          <button
            key={s.value || 'all'}
            onClick={() => setSearchParams(s.value ? { status: s.value } : {})}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
              filter === s.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-48 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : intros.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="h-12 w-12 text-gray-300 mx-auto mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
            />
          </svg>
          <p className="text-sm text-gray-500">
            No warm intro requests{filter ? ` with status "${STATUS_LABELS[filter]}"` : ''}.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {intros.map((intro) => (
            <div
              key={intro.id}
              className="bg-white rounded-xl border border-gray-200 p-5 space-y-3"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900">{intro.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <a
                      href={`mailto:${intro.email}`}
                      className="text-xs text-brand-500 hover:underline"
                    >
                      {intro.email}
                    </a>
                    {intro.linkedin && (
                      <a
                        href={intro.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        LinkedIn
                      </a>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${STATUS_STYLES[intro.status] || STATUS_STYLES.pending}`}
                  >
                    {STATUS_LABELS[intro.status] || intro.status}
                  </span>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {getRelativeTimeLabel(intro.created_at)}
                  </p>
                </div>
              </div>

              {/* Message */}
              {intro.message && (
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 italic">
                  "{intro.message}"
                </p>
              )}

              {/* Job context */}
              <div className="text-xs text-gray-500 space-y-0.5">
                <p>
                  <span className="text-gray-400">Wants intro to:</span>{' '}
                  <span className="text-gray-900 font-medium">{intro.job_title}</span> at{' '}
                  <span className="text-gray-900 font-medium">{intro.job_company}</span>
                </p>
                {intro.job_submitter_email && (
                  <p>
                    <span className="text-gray-400">Posted by:</span>{' '}
                    <a
                      href={`mailto:${intro.job_submitter_email}`}
                      className="text-brand-500 hover:underline"
                    >
                      {intro.job_submitter_name || intro.job_submitter_email}
                    </a>
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100">
                {(['pending', 'contacted', 'connected', 'no_response'] as const)
                  .filter((s) => s !== intro.status)
                  .map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(intro.id, s)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors ${STATUS_ACTION_STYLES[s]}`}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
