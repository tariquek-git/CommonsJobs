import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import {
  getWarmIntros,
  updateWarmIntroStatus,
  sendIntroFollowUp,
  getEmailLogs,
} from '../../lib/api';
import type { WarmIntroRecord, EmailLog } from '../../lib/api';
import { getRelativeTimeLabel } from '../../lib/date';

// ─── Constants ───

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  contacted: 'Contacted',
  connected: 'Connected',
  no_response: 'No Response',
};

const STATUS_ORDER = ['pending', 'contacted', 'connected', 'no_response'];

const PIPELINE_CONFIG: Record<
  string,
  {
    label: string;
    color: string;
    activeBg: string;
    activeBorder: string;
    textColor: string;
    countColor: string;
  }
> = {
  pending: {
    label: 'Pending',
    color: 'border-gray-200 bg-white hover:border-amber-200',
    activeBg: 'bg-amber-50',
    activeBorder: 'border-amber-400',
    textColor: 'text-amber-600',
    countColor: 'text-amber-700',
  },
  contacted: {
    label: 'Contacted',
    color: 'border-gray-200 bg-white hover:border-blue-200',
    activeBg: 'bg-blue-50',
    activeBorder: 'border-blue-400',
    textColor: 'text-blue-600',
    countColor: 'text-blue-700',
  },
  connected: {
    label: 'Connected',
    color: 'border-gray-200 bg-white hover:border-emerald-200',
    activeBg: 'bg-emerald-50',
    activeBorder: 'border-emerald-400',
    textColor: 'text-emerald-600',
    countColor: 'text-emerald-700',
  },
  no_response: {
    label: 'No Reply',
    color: 'border-gray-200 bg-white hover:border-gray-300',
    activeBg: 'bg-gray-50',
    activeBorder: 'border-gray-400',
    textColor: 'text-gray-500',
    countColor: 'text-gray-600',
  },
};

const CARD_BORDER: Record<string, string> = {
  pending: 'border-l-amber-400',
  contacted: 'border-l-blue-400',
  connected: 'border-l-emerald-400',
  no_response: 'border-l-gray-300',
};

const BADGE_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  contacted: 'bg-blue-50 text-blue-700',
  connected: 'bg-emerald-50 text-emerald-700',
  no_response: 'bg-gray-100 text-gray-500',
};

// ─── Confirmation modal types ───

interface ConfirmModalState {
  introId: string;
  introName: string;
  introEmail: string;
  currentStatus: string;
  newStatus: string;
  jobTitle: string;
  jobCompany: string;
  jobSubmitterName?: string;
  jobSubmitterEmail?: string;
}

function getEmailPreview(newStatus: string, intro: ConfirmModalState): string[] {
  switch (newStatus) {
    case 'contacted':
      return [
        `Will email ${intro.introName}: "I'm reaching out to ${intro.jobCompany} on your behalf"`,
      ];
    case 'connected':
      return [
        `Will email ${intro.introName}: Introduction to the hiring contact`,
        `Will email the hiring contact: Introduction to ${intro.introName}`,
      ];
    case 'no_response':
      return [`Will email ${intro.introName}: "Sorry, no response from ${intro.jobCompany}"`];
    case 'pending':
      return ['No emails sent — reverting to pending'];
    default:
      return [];
  }
}

// ─── Main Component ───

export default function IntrosPage() {
  const { token } = useAdminAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = searchParams.get('status') || '';

  const [allIntros, setAllIntros] = useState<WarmIntroRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'stale'>('newest');

  // Confirmation modal
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactRole, setContactRole] = useState('');

  // Email logs
  const [emailLogs, setEmailLogs] = useState<Record<string, EmailLog[]>>({});
  const [loadingLogs, setLoadingLogs] = useState<string | null>(null);
  const [expandedTrail, setExpandedTrail] = useState<string | null>(null);

  // Fetch ALL intros (no server filter) for pipeline counts
  const fetchIntros = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getWarmIntros(token);
      setAllIntros(result.intros);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load warm intros');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchIntros();
  }, [fetchIntros]);

  useEffect(() => {
    document.title = 'Warm Intros | Admin';
  }, []);

  // ─── Computed data ───

  const counts = useMemo(() => {
    const c = { pending: 0, contacted: 0, connected: 0, no_response: 0 };
    for (const intro of allIntros) {
      if (intro.status in c) c[intro.status as keyof typeof c]++;
    }
    return c;
  }, [allIntros]);

  const filteredIntros = useMemo(() => {
    let list = filter ? allIntros.filter((i) => i.status === filter) : allIntros;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.email.toLowerCase().includes(q) ||
          (i.job_title || '').toLowerCase().includes(q) ||
          (i.job_company || '').toLowerCase().includes(q) ||
          (i.job_submitter_name || '').toLowerCase().includes(q) ||
          (i.message || '').toLowerCase().includes(q),
      );
    }

    // Sort
    return [...list].sort((a, b) => {
      if (sortBy === 'stale') {
        // Stale first (most days in status)
        return (b.days_in_status || 0) - (a.days_in_status || 0);
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      // Default: urgency sort (pending first) then newest
      const aIdx = STATUS_ORDER.indexOf(a.status);
      const bIdx = STATUS_ORDER.indexOf(b.status);
      if (aIdx !== bIdx) return aIdx - bIdx;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [allIntros, filter, searchQuery, sortBy]);

  // ─── Actions ───

  const requestStatusChange = (intro: WarmIntroRecord, newStatus: string) => {
    setConfirmModal({
      introId: intro.id,
      introName: intro.name,
      introEmail: intro.email,
      currentStatus: intro.status,
      newStatus,
      jobTitle: intro.job_title || 'Unknown Role',
      jobCompany: intro.job_company || 'Unknown Company',
      jobSubmitterName: intro.job_submitter_name || undefined,
      jobSubmitterEmail: intro.job_submitter_email || undefined,
    });
    if (newStatus === 'connected') {
      setContactName(intro.job_submitter_name || '');
      setContactEmail(intro.job_submitter_email || '');
      setContactRole('');
    }
  };

  const confirmStatusChange = async () => {
    if (!token || !confirmModal) return;
    if (confirmModal.newStatus === 'connected' && (!contactName.trim() || !contactEmail.trim())) {
      setError('Contact name and email are required to make an introduction.');
      return;
    }
    setConfirmLoading(true);
    try {
      const extra =
        confirmModal.newStatus === 'connected'
          ? {
              contact_name: contactName.trim(),
              contact_email: contactEmail.trim(),
              contact_role: contactRole.trim() || undefined,
            }
          : undefined;
      await updateWarmIntroStatus(token, confirmModal.introId, confirmModal.newStatus, extra);
      setAllIntros((prev) =>
        prev.map((intro) =>
          intro.id === confirmModal.introId ? { ...intro, status: confirmModal.newStatus } : intro,
        ),
      );
      setConfirmModal(null);
      setError(null);
      if (expandedTrail === confirmModal.introId && emailLogs[confirmModal.introId]) {
        setTimeout(() => fetchEmailLogs(confirmModal.introId), 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleFollowUp = async (id: string) => {
    if (!token) return;
    if (!window.confirm('Send "How did it go?" follow-up email?')) return;
    try {
      await sendIntroFollowUp(token, id);
      setError(null);
      const el = document.getElementById(`followup-${id}`);
      if (el) {
        el.textContent = 'Sent ✓';
        el.classList.add('opacity-50', 'pointer-events-none');
      }
      if (expandedTrail === id && emailLogs[id]) {
        fetchEmailLogs(id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send follow-up');
    }
  };

  const fetchEmailLogs = async (introId: string) => {
    if (!token) return;
    setLoadingLogs(introId);
    try {
      const result = await getEmailLogs(token, {
        intro_id: introId,
        limit: 50,
      });
      setEmailLogs((prev) => ({ ...prev, [introId]: result.logs }));
    } catch {
      // Non-critical
    } finally {
      setLoadingLogs(null);
    }
  };

  const toggleEmailTrail = (introId: string) => {
    if (expandedTrail === introId) {
      setExpandedTrail(null);
    } else {
      setExpandedTrail(introId);
      if (!emailLogs[introId]) fetchEmailLogs(introId);
    }
  };

  // ─── Render ───

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Warm Intros</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {allIntros.length} total request
            {allIntros.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={fetchIntros}
          className="text-xs px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Pipeline Header */}
      <PipelineHeader
        counts={counts}
        activeFilter={filter}
        onFilter={(status) => setSearchParams(status ? { status } : {})}
      />

      {/* Search & Sort */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, job, company..."
            className="w-full text-sm border border-gray-200 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'stale')}
          className="text-xs border border-gray-200 rounded-lg px-3 py-2 text-gray-600 bg-white"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="stale">Needs attention</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-gray-200 p-5 animate-pulse"
            >
              <div className="h-4 w-40 bg-gray-200 rounded mb-3" />
              <div className="h-3 w-64 bg-gray-100 rounded mb-2" />
              <div className="h-3 w-32 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : filteredIntros.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div className="space-y-3">
          {filteredIntros.map((intro) => (
            <IntroCard
              key={intro.id}
              intro={intro}
              onStatusChange={requestStatusChange}
              onFollowUp={handleFollowUp}
              emailTrailExpanded={expandedTrail === intro.id}
              onToggleTrail={() => toggleEmailTrail(intro.id)}
              emailLogs={emailLogs[intro.id]}
              loadingLogs={loadingLogs === intro.id}
            />
          ))}
        </div>
      )}

      {/* ─── Confirmation Modal ─── */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div
            className={`bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border-l-4 ${CARD_BORDER[confirmModal.newStatus] || 'border-l-gray-300'}`}
          >
            <h3 className="text-lg font-bold text-gray-900">
              {STATUS_LABELS[confirmModal.newStatus]}: {confirmModal.introName}
            </h3>

            <p className="text-sm text-gray-500">
              {confirmModal.jobTitle} at {confirmModal.jobCompany}
            </p>

            {/* What emails will fire */}
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 space-y-1.5">
              <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">
                Emails that will send
              </p>
              {getEmailPreview(confirmModal.newStatus, confirmModal).map((line, i) => (
                <p key={i} className="text-sm text-blue-800">
                  {line}
                </p>
              ))}
            </div>

            {/* Contact info for "connected" */}
            {confirmModal.newStatus === 'connected' && (
              <div className="space-y-3 rounded-xl bg-gray-50 border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Introducing them to
                  </p>
                  {(confirmModal.jobSubmitterName || confirmModal.jobSubmitterEmail) && (
                    <span className="text-[10px] text-gray-400">Pre-filled from job submitter</span>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Name *</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                    placeholder="e.g. Sarah Chen"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Email *</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                    placeholder="sarah@company.com"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Role (optional)</label>
                  <input
                    type="text"
                    value={contactRole}
                    onChange={(e) => setContactRole(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                    placeholder="e.g. Engineering Manager"
                  />
                </div>
                {(!contactName.trim() || !contactEmail.trim()) && (
                  <p className="text-xs text-red-500">Both name and email are required.</p>
                )}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setConfirmModal(null);
                  setError(null);
                }}
                className="flex-1 text-sm px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmStatusChange}
                disabled={
                  confirmLoading ||
                  (confirmModal.newStatus === 'connected' &&
                    (!contactName.trim() || !contactEmail.trim()))
                }
                className={`flex-1 text-sm px-4 py-2.5 rounded-xl font-semibold transition-colors ${
                  confirmModal.newStatus === 'no_response'
                    ? 'bg-gray-700 text-white hover:bg-gray-800'
                    : 'bg-brand-500 text-white hover:bg-brand-600'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {confirmLoading ? 'Sending...' : 'Confirm & Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ════════════════════════════════════════════════════════════

// ─── Pipeline Header ───

function PipelineHeader({
  counts,
  activeFilter,
  onFilter,
}: {
  counts: Record<string, number>;
  activeFilter: string;
  onFilter: (status: string) => void;
}) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="mb-6">
      {/* "All" toggle */}
      <button
        onClick={() => onFilter('')}
        className={`text-xs font-medium mb-3 px-2.5 py-1 rounded-md transition-colors ${
          activeFilter === ''
            ? 'bg-gray-900 text-white'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
        }`}
      >
        All ({total})
      </button>

      {/* Pipeline segments */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {STATUS_ORDER.map((status, idx) => {
          const cfg = PIPELINE_CONFIG[status];
          const isActive = activeFilter === status;
          const count = counts[status] || 0;

          return (
            <div key={status} className="relative flex items-center">
              <button
                onClick={() => onFilter(isActive ? '' : status)}
                className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                  isActive ? `${cfg.activeBg} ${cfg.activeBorder} shadow-sm` : cfg.color
                }`}
              >
                <p
                  className={`text-[11px] font-semibold uppercase tracking-wider ${cfg.textColor}`}
                >
                  {cfg.label}
                </p>
                <p className={`text-2xl font-bold mt-1 ${cfg.countColor}`}>{count}</p>
              </button>
              {/* Arrow between segments (desktop, not after last) */}
              {idx < STATUS_ORDER.length - 1 && idx !== 2 && (
                <span className="hidden lg:block absolute -right-2 z-10 text-gray-300 text-sm">
                  ›
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Intro Card ───

function IntroCard({
  intro,
  onStatusChange,
  onFollowUp,
  emailTrailExpanded,
  onToggleTrail,
  emailLogs: logs,
  loadingLogs,
}: {
  intro: WarmIntroRecord;
  onStatusChange: (intro: WarmIntroRecord, status: string) => void;
  onFollowUp: (id: string) => void;
  emailTrailExpanded: boolean;
  onToggleTrail: () => void;
  emailLogs?: EmailLog[];
  loadingLogs: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 border-l-4 ${CARD_BORDER[intro.status] || CARD_BORDER.pending} ${intro.is_stale ? 'ring-1 ring-amber-200' : ''}`}
    >
      <div className="p-5 space-y-3">
        {/* Top row: Status + stale badge + time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusBadge status={intro.status} />
            {intro.is_stale && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700">
                ⚠ {intro.days_in_status}d — needs attention
              </span>
            )}
          </div>
          <span className="text-[11px] text-gray-400">
            {getRelativeTimeLabel(intro.created_at)}
          </span>
        </div>

        {/* Relationship Grid: Requester → Job → Submitter */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* REQUESTER */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Requester
            </p>
            <p className="text-sm font-semibold text-gray-900">{intro.name}</p>
            <div className="flex flex-col gap-0.5">
              <a
                href={`mailto:${intro.email}`}
                className="text-xs text-brand-500 hover:underline truncate"
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
                  LinkedIn ↗
                </a>
              )}
            </div>
            {intro.referrer_name && (
              <p className="text-[11px] text-gray-400">
                via {intro.referrer_name}
                {intro.referrer_company ? ` (${intro.referrer_company})` : ''}
              </p>
            )}
          </div>

          {/* JOB */}
          <div className="bg-blue-50/50 rounded-lg p-3 space-y-1.5">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Job</p>
            <p className="text-sm font-semibold text-gray-900">{intro.job_title}</p>
            <p className="text-xs text-gray-600">{intro.job_company}</p>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                  intro.job_status === 'active'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {intro.job_status || 'unknown'}
              </span>
              {intro.job_apply_url && (
                <a
                  href={intro.job_apply_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-brand-500 hover:underline"
                >
                  View listing ↗
                </a>
              )}
            </div>
          </div>

          {/* SUBMITTER / CONTACT */}
          <div className="bg-purple-50/50 rounded-lg p-3 space-y-1.5">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Posted by
            </p>
            {intro.job_submitter_name ? (
              <>
                <p className="text-sm font-semibold text-gray-900">{intro.job_submitter_name}</p>
                {intro.job_submitter_email && (
                  <a
                    href={`mailto:${intro.job_submitter_email}`}
                    className="text-xs text-brand-500 hover:underline truncate block"
                  >
                    {intro.job_submitter_email}
                  </a>
                )}
              </>
            ) : (
              <p className="text-xs text-gray-400 italic">No submitter info</p>
            )}
          </div>
        </div>

        {/* Message (if any) */}
        {intro.message && <MessageBlock text={intro.message} />}

        {/* Bottom bar: Actions + Meta */}
        <div className="flex items-center justify-between gap-3 pt-1 border-t border-gray-100">
          <div className="flex items-center gap-2 flex-wrap">
            <PrimaryAction intro={intro} onStatusChange={onStatusChange} onFollowUp={onFollowUp} />
            <SecondaryActions intro={intro} onStatusChange={onStatusChange} />
          </div>

          <div className="flex items-center gap-3 text-[11px] text-gray-400 shrink-0">
            {intro.email_count > 0 && (
              <span>
                {intro.email_count} email{intro.email_count !== 1 ? 's' : ''}
              </span>
            )}
            {intro.last_email_at && <span>Last: {getRelativeTimeLabel(intro.last_email_at)}</span>}
          </div>
        </div>

        {/* Email trail toggle */}
        <button
          onClick={onToggleTrail}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg
            className={`h-3 w-3 transition-transform ${emailTrailExpanded ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          Email trail{logs ? ` (${logs.length})` : ''}
        </button>

        {/* Email trail content */}
        {emailTrailExpanded && <EmailTrail logs={logs} loading={loadingLogs} />}
      </div>
    </div>
  );
}

// ─── Status Badge ───

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${BADGE_STYLES[status] || BADGE_STYLES.pending}`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}

// ─── Collapsible Message ───

function MessageBlock({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 120;
  const display = isLong && !expanded ? text.slice(0, 120) + '...' : text;

  return (
    <div className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2.5">
      <span className="italic">&ldquo;{display}&rdquo;</span>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-brand-500 text-xs ml-1 hover:underline"
        >
          {expanded ? 'less' : 'more'}
        </button>
      )}
    </div>
  );
}

// ─── Primary Action ───

function PrimaryAction({
  intro,
  onStatusChange,
  onFollowUp,
}: {
  intro: WarmIntroRecord;
  onStatusChange: (intro: WarmIntroRecord, status: string) => void;
  onFollowUp: (id: string) => void;
}) {
  switch (intro.status) {
    case 'pending':
      return (
        <button
          onClick={() => onStatusChange(intro, 'contacted')}
          className="text-xs px-3.5 py-2 rounded-lg font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        >
          I reached out →
        </button>
      );
    case 'contacted':
      return (
        <div className="flex gap-2">
          <button
            onClick={() => onStatusChange(intro, 'connected')}
            className="text-xs px-3.5 py-2 rounded-lg font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
          >
            Make intro →
          </button>
          <button
            onClick={() => onStatusChange(intro, 'no_response')}
            className="text-xs px-3.5 py-2 rounded-lg font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            No response
          </button>
        </div>
      );
    case 'connected':
      return (
        <button
          id={`followup-${intro.id}`}
          onClick={() => onFollowUp(intro.id)}
          className="text-xs px-3.5 py-2 rounded-lg font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
        >
          Send follow-up
        </button>
      );
    case 'no_response':
      return (
        <span className="text-xs text-gray-400 italic">Closed — no response from hiring side</span>
      );
    default:
      return null;
  }
}

// ─── Secondary Actions ───

function SecondaryActions({
  intro,
  onStatusChange,
}: {
  intro: WarmIntroRecord;
  onStatusChange: (intro: WarmIntroRecord, status: string) => void;
}) {
  const options: { status: string; label: string }[] = [];

  if (intro.status === 'contacted') {
    options.push({ status: 'pending', label: 'Revert to pending' });
  }
  if (intro.status === 'connected') {
    options.push({ status: 'contacted', label: 'Revert to contacted' });
  }
  if (intro.status === 'no_response') {
    options.push({ status: 'contacted', label: 'Try again' });
  }

  if (options.length === 0) return null;

  return (
    <div className="flex gap-2 ml-auto">
      {options.map((opt) => (
        <button
          key={opt.status}
          onClick={() => onStatusChange(intro, opt.status)}
          className="text-[11px] text-gray-400 hover:text-gray-600 hover:underline transition-colors"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Email Trail ───

function EmailTrail({ logs, loading }: { logs?: EmailLog[]; loading: boolean }) {
  if (loading) {
    return <div className="text-xs text-gray-400 animate-pulse">Loading email history...</div>;
  }
  if (!logs || logs.length === 0) {
    return <div className="text-xs text-gray-400">No emails sent yet.</div>;
  }

  return (
    <div className="space-y-1">
      {logs.map((log) => (
        <EmailRow key={log.id} log={log} />
      ))}
    </div>
  );
}

// ─── Email Row ───

const EVENT_SHORT: Record<string, string> = {
  warm_intro_admin_notification: 'Admin notified',
  warm_intro_thank_you: 'Thank-you sent',
  warm_intro_contacted: '"I\'m on it" sent',
  warm_intro_connection_requester: 'Intro → requester',
  warm_intro_connection_contact: 'Intro → hiring contact',
  warm_intro_no_response: 'No response sent',
  warm_intro_follow_up: 'Follow-up sent',
};

function EmailRow({ log }: { log: EmailLog }) {
  const label = EVENT_SHORT[log.event_type] || log.event_type;
  const failed = log.status === 'failed';

  return (
    <div
      className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-md ${
        failed ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-500'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${failed ? 'bg-red-400' : 'bg-emerald-400'}`}
      />
      <span className="font-medium text-gray-700">{label}</span>
      <span className="text-gray-400 truncate">→ {log.recipient}</span>
      <span className="ml-auto text-gray-400 shrink-0">{getRelativeTimeLabel(log.created_at)}</span>
      {failed && log.error_message && (
        <span className="text-red-500 truncate max-w-[200px]" title={log.error_message}>
          {log.error_message}
        </span>
      )}
    </div>
  );
}

// ─── Empty State ───

function EmptyState({ filter }: { filter: string }) {
  const messages: Record<string, string> = {
    pending: 'No new requests. Check back later.',
    contacted: 'No intros waiting on responses.',
    connected: 'No completed intros yet.',
    no_response: 'No dead ends. Nice.',
  };

  return (
    <div className="text-center py-16">
      <div className="text-4xl mb-3">🤝</div>
      <p className="text-sm text-gray-500">
        {filter
          ? messages[filter] || 'No intro requests with this status.'
          : 'No warm intro requests yet.'}
      </p>
    </div>
  );
}
