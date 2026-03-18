import { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { getEmailLogs } from '../../lib/api';
import type { EmailLog, EmailLogRecipient } from '../../lib/api';

const EVENT_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  submission_notification: {
    label: 'Admin: New Submission',
    emoji: '📥',
    color: 'bg-gray-100 text-gray-700',
  },
  submission_confirmation: {
    label: 'Submission Confirmed',
    emoji: '👍',
    color: 'bg-blue-50 text-blue-700',
  },
  warm_intro_admin_notification: {
    label: 'Admin: Intro Request',
    emoji: '🤝',
    color: 'bg-gray-100 text-gray-700',
  },
  warm_intro_thank_you: {
    label: 'Intro Thank You',
    emoji: '👋',
    color: 'bg-blue-50 text-blue-700',
  },
  job_approved_notification: {
    label: 'Job Approved',
    emoji: '🎉',
    color: 'bg-green-50 text-green-700',
  },
  warm_intro_contacted: { label: 'Contacted', emoji: '⏳', color: 'bg-amber-50 text-amber-700' },
  warm_intro_connection_requester: {
    label: 'Intro → Requester',
    emoji: '🚀',
    color: 'bg-purple-50 text-purple-700',
  },
  warm_intro_connection_contact: {
    label: 'Intro → Contact',
    emoji: '👋',
    color: 'bg-purple-50 text-purple-700',
  },
  warm_intro_no_response: { label: 'No Response', emoji: '😐', color: 'bg-red-50 text-red-700' },
  warm_intro_follow_up: { label: 'Follow Up', emoji: '📬', color: 'bg-indigo-50 text-indigo-700' },
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === 'sent'
      ? 'bg-green-50 text-green-700 border-green-200'
      : status === 'failed'
        ? 'bg-red-50 text-red-700 border-red-200'
        : 'bg-gray-50 text-gray-600 border-gray-200';
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${styles}`}
    >
      {status === 'sent' ? '✓' : status === 'failed' ? '✗' : '?'} {status}
    </span>
  );
}

function EventBadge({ eventType }: { eventType: string }) {
  const info = EVENT_LABELS[eventType] || {
    label: eventType,
    emoji: '📧',
    color: 'bg-gray-100 text-gray-600',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${info.color}`}
    >
      {info.emoji} {info.label}
    </span>
  );
}

function LogRow({
  log,
  onFilter,
}: {
  log: EmailLog;
  onFilter: (key: string, val: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <EventBadge eventType={log.event_type} />
            <StatusBadge status={log.status} />
            <span className="text-[11px] text-gray-400">{timeAgo(log.created_at)}</span>
          </div>
          <p className="text-sm font-medium text-gray-900 mt-1 truncate">{log.subject}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            → {log.recipient}
            {log.from && <span className="text-gray-400"> from {log.from}</span>}
          </p>
        </div>
        <svg
          className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-3 border-t border-gray-100 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs mt-2">
            <div>
              <span className="text-gray-400">Event:</span>{' '}
              <button
                onClick={() => onFilter('event_type', log.event_type)}
                className="text-brand-600 hover:underline"
              >
                {log.event_type}
              </button>
            </div>
            <div>
              <span className="text-gray-400">To:</span>{' '}
              <button
                onClick={() => onFilter('recipient', log.recipient)}
                className="text-brand-600 hover:underline"
              >
                {log.recipient}
              </button>
            </div>
            {log.resend_id && (
              <div>
                <span className="text-gray-400">Resend ID:</span>{' '}
                <span className="font-mono text-gray-600">{log.resend_id}</span>
              </div>
            )}
            {log.related_job_id && (
              <div>
                <span className="text-gray-400">Job:</span>{' '}
                <button
                  onClick={() => onFilter('job_id', log.related_job_id!)}
                  className="text-brand-600 hover:underline font-mono"
                >
                  {log.related_job_id.slice(0, 8)}…
                </button>
              </div>
            )}
            {log.related_warm_intro_id && (
              <div>
                <span className="text-gray-400">Intro:</span>{' '}
                <button
                  onClick={() => onFilter('intro_id', log.related_warm_intro_id!)}
                  className="text-brand-600 hover:underline font-mono"
                >
                  {log.related_warm_intro_id.slice(0, 8)}…
                </button>
              </div>
            )}
            <div>
              <span className="text-gray-400">Sent:</span>{' '}
              <span className="text-gray-600">{new Date(log.created_at).toLocaleString()}</span>
            </div>
          </div>

          {log.error_message && (
            <div className="rounded bg-red-50 border border-red-200 p-2 text-xs text-red-700">
              <strong>Error:</strong> {log.error_message}
            </div>
          )}

          {log.body_text && (
            <details className="text-xs">
              <summary className="text-gray-400 cursor-pointer hover:text-gray-600">
                View plain text body
              </summary>
              <pre className="mt-1 p-2 bg-gray-50 rounded border border-gray-200 whitespace-pre-wrap text-gray-600 text-[11px] leading-relaxed max-h-48 overflow-y-auto">
                {log.body_text}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function RecipientCard({
  r,
  onFilter,
}: {
  r: EmailLogRecipient;
  onFilter: (email: string) => void;
}) {
  return (
    <button
      onClick={() => onFilter(r.email)}
      className="bg-white rounded-lg border border-gray-200 p-3 text-left hover:border-brand-300 hover:shadow-sm transition-all"
    >
      <p className="text-sm font-medium text-gray-900 truncate">{r.email}</p>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs text-gray-500">
          {r.count} email{r.count !== 1 ? 's' : ''}
        </span>
        <span className="text-[10px] text-gray-400">Last: {timeAgo(r.last_sent)}</span>
      </div>
      <div className="flex flex-wrap gap-1 mt-1.5">
        {r.event_types.map((et) => {
          const info = EVENT_LABELS[et];
          return (
            <span key={et} className="text-[10px] text-gray-400">
              {info?.emoji || '📧'}
            </span>
          );
        })}
      </div>
    </button>
  );
}

export default function EmailPage() {
  const { token } = useAdminAuth();
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [recipients, setRecipients] = useState<EmailLogRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<'activity' | 'recipients'>('activity');

  const fetchLogs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getEmailLogs(token, { ...filters, limit: 100 });
      setLogs(res.logs);
      setRecipients(res.recipients);
    } catch {
      setError('Failed to load email logs. Make sure the email_logs table exists in Supabase.');
    } finally {
      setLoading(false);
    }
  }, [token, filters]);

  useEffect(() => {
    document.title = 'Email Activity | Admin';
    fetchLogs();
  }, [fetchLogs]);

  const setFilter = (key: string, val: string) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
    setTab('activity');
  };

  const clearFilters = () => setFilters({});
  const activeFilterCount = Object.keys(filters).length;

  const stats = {
    total: logs.length,
    sent: logs.filter((l) => l.status === 'sent').length,
    failed: logs.filter((l) => l.status === 'failed').length,
    uniqueRecipients: recipients.length,
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Activity</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Every email sent through the platform. Click any row to expand.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/email-preview.html"
            target="_blank"
            className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            📧 Preview Templates
          </a>
          <button
            onClick={fetchLogs}
            className="text-xs px-3 py-1.5 rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[11px] text-gray-400 uppercase tracking-wider">Total</p>
          <p className="text-2xl font-bold text-gray-900 mt-0.5">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[11px] text-gray-400 uppercase tracking-wider">Sent</p>
          <p className="text-2xl font-bold text-green-600 mt-0.5">{stats.sent}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[11px] text-gray-400 uppercase tracking-wider">Failed</p>
          <p className="text-2xl font-bold text-red-600 mt-0.5">{stats.failed}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[11px] text-gray-400 uppercase tracking-wider">Recipients</p>
          <p className="text-2xl font-bold text-brand-600 mt-0.5">{stats.uniqueRecipients}</p>
        </div>
      </div>

      {/* Active filters */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">Filtering by:</span>
          {Object.entries(filters).map(([k, v]) => (
            <span
              key={k}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-brand-50 text-brand-700 text-xs"
            >
              {k}: {v.length > 20 ? v.slice(0, 20) + '…' : v}
              <button
                onClick={() =>
                  setFilters((prev) => {
                    const n = { ...prev };
                    delete n[k];
                    return n;
                  })
                }
                className="ml-0.5 text-brand-400 hover:text-brand-700"
              >
                ×
              </button>
            </span>
          ))}
          <button
            onClick={clearFilters}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        <button
          onClick={() => setTab('activity')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'activity'
              ? 'border-brand-500 text-brand-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Activity ({logs.length})
        </button>
        <button
          onClick={() => setTab('recipients')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'recipients'
              ? 'border-brand-500 text-brand-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Recipients ({recipients.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-center">
          <p className="text-sm text-red-700">{error}</p>
          <p className="text-xs text-red-500 mt-2">
            Run <code className="bg-red-100 px-1 py-0.5 rounded">scripts/setup-database.sql</code>{' '}
            in your Supabase SQL Editor to create the table.
          </p>
        </div>
      ) : tab === 'activity' ? (
        <div className="space-y-2">
          {logs.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-2">📭</p>
              <p className="text-sm text-gray-500">No emails sent yet.</p>
              <p className="text-xs text-gray-400 mt-1">
                Emails are sent automatically when you approve jobs, update intro statuses, or when
                users submit jobs/intros.
              </p>
            </div>
          ) : (
            logs.map((log) => <LogRow key={log.id} log={log} onFilter={setFilter} />)
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {recipients.length === 0 ? (
            <div className="col-span-full text-center py-16">
              <p className="text-sm text-gray-500">No recipients yet.</p>
            </div>
          ) : (
            recipients.map((r) => (
              <RecipientCard
                key={r.email}
                r={r}
                onFilter={(email) => setFilter('recipient', email)}
              />
            ))
          )}
        </div>
      )}

      {/* How it works */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-sm font-semibold text-gray-700">Email Triggers</h3>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
          <div className="flex items-start gap-2">
            <span className="text-sm">📥</span>
            <div>
              <strong className="text-gray-700">Job submitted</strong>
              <p className="text-gray-500">Admin notification + submitter confirmation</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-sm">🤝</span>
            <div>
              <strong className="text-gray-700">Warm intro requested</strong>
              <p className="text-gray-500">Admin notification + requester thank you</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-sm">🎉</span>
            <div>
              <strong className="text-gray-700">Job approved</strong>
              <p className="text-gray-500">Submitter gets "you're live" email</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-sm">⏳</span>
            <div>
              <strong className="text-gray-700">Intro → Contacted</strong>
              <p className="text-gray-500">Requester gets "I'm on it" update</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-sm">🚀</span>
            <div>
              <strong className="text-gray-700">Intro → Connected</strong>
              <p className="text-gray-500">Both sides get introduction emails</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-sm">😐</span>
            <div>
              <strong className="text-gray-700">Intro → No Response</strong>
              <p className="text-gray-500">Requester notified, nudged to browse more</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-sm">📬</span>
            <div>
              <strong className="text-gray-700">Follow up (manual)</strong>
              <p className="text-gray-500">"How did it go?" sent from Intros page</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-sm">🛡️</span>
            <div>
              <strong className="text-gray-700">Duplicate prevention</strong>
              <p className="text-gray-500">Checks this log before sending to avoid re-sends</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
