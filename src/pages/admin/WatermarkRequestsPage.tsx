import { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '../../hooks/useAdminAuth';

interface WatermarkRequest {
  id: string;
  approve_token: string;
  name: string;
  email: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  code: string | null;
  created_at: string;
  approved_at: string | null;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-700',
};

export default function WatermarkRequestsPage() {
  const { token } = useAdminAuth();
  const [requests, setRequests] = useState<WatermarkRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const fetchRequests = useCallback(async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      setError('Supabase not configured — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
      setLoading(false);
      return;
    }

    try {
      const url = new URL(`${SUPABASE_URL}/rest/v1/watermark_requests`);
      url.searchParams.set(
        'select',
        'id,approve_token,name,email,reason,status,code,created_at,approved_at',
      );
      url.searchParams.set('order', 'created_at.desc');
      url.searchParams.set('limit', '200');
      if (filter !== 'all') url.searchParams.set('status', `eq.${filter}`);

      const resp = await fetch(url.toString(), {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token ?? SUPABASE_ANON_KEY}`,
        },
      });

      if (!resp.ok) throw new Error(`Supabase error: ${resp.status}`);
      const rows = (await resp.json()) as WatermarkRequest[];
      setRequests(rows);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filter, token]);

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  const pending = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className="px-6 py-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Watermark Removal Requests</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Requests from Flow of Funds users to remove the export watermark.
            {pending > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                {pending} pending
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            void fetchRequests();
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
          Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-100 pb-0">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              filter === f
                ? 'border-brand-500 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Content */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading && !error && (
        <div className="flex items-center justify-center py-16">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      )}

      {!loading && !error && requests.length === 0 && (
        <div className="text-center py-16 text-gray-400 text-sm">
          No {filter !== 'all' ? filter : ''} requests yet.
        </div>
      )}

      {!loading && !error && requests.length > 0 && (
        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 text-sm">{req.name}</span>
                    <a
                      href={`mailto:${req.email}`}
                      className="text-xs text-brand-600 hover:underline truncate"
                    >
                      {req.email}
                    </a>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_COLORS[req.status] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      {req.status}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">{req.reason}</p>
                  {req.code && (
                    <p className="mt-1.5 text-xs text-gray-400">
                      Code: <code className="font-mono text-gray-700 font-medium">{req.code}</code>
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <p className="text-[11px] text-gray-400">
                    {new Date(req.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                  {req.status === 'pending' && (
                    <a
                      href={`https://flow.fintechcommons.com/api/watermark-approve?token=${req.approve_token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-md px-2 py-1 transition-colors"
                    >
                      Approve →
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Setup instructions */}
      {(!SUPABASE_URL || !SUPABASE_ANON_KEY) && (
        <div className="mt-8 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700">
          <strong>Setup required:</strong> Set <code className="text-xs">VITE_SUPABASE_URL</code>{' '}
          and <code className="text-xs">VITE_SUPABASE_ANON_KEY</code> in Vercel env vars for the{' '}
          <code className="text-xs">fintech-commons</code> project.
        </div>
      )}
    </div>
  );
}
