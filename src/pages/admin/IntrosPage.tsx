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
  accepted: 'Accepted',
  connected: 'Introduced',
  followed_up: 'Followed Up',
  declined: 'Declined',
  no_response: 'No Response',
};

const STATUS_ORDER = [
  'pending',
  'contacted',
  'accepted',
  'connected',
  'followed_up',
  'declined',
  'no_response',
];

interface PipelineCfg {
  label: string;
  subtitle: string;
  color: string;
  activeBg: string;
  activeBorder: string;
  textColor: string;
  countColor: string;
}

const PIPELINE_CONFIG: Record<string, PipelineCfg> = {
  pending: {
    label: 'Pending',
    subtitle: 'Need your action',
    color: 'border-gray-200 bg-white hover:border-amber-200',
    activeBg: 'bg-amber-50',
    activeBorder: 'border-amber-400',
    textColor: 'text-amber-600',
    countColor: 'text-amber-700',
  },
  contacted: {
    label: 'Contacted',
    subtitle: 'Waiting on hiring contact',
    color: 'border-gray-200 bg-white hover:border-blue-200',
    activeBg: 'bg-blue-50',
    activeBorder: 'border-blue-400',
    textColor: 'text-blue-600',
    countColor: 'text-blue-700',
  },
  accepted: {
    label: 'Accepted',
    subtitle: 'Contact said yes — send intro',
    color: 'border-gray-200 bg-white hover:border-teal-200',
    activeBg: 'bg-teal-50',
    activeBorder: 'border-teal-400',
    textColor: 'text-teal-600',
    countColor: 'text-teal-700',
  },
  connected: {
    label: 'Introduced',
    subtitle: 'Both sides connected',
    color: 'border-gray-200 bg-white hover:border-emerald-200',
    activeBg: 'bg-emerald-50',
    activeBorder: 'border-emerald-400',
    textColor: 'text-emerald-600',
    countColor: 'text-emerald-700',
  },
  followed_up: {
    label: 'Followed Up',
    subtitle: 'Check-in sent',
    color: 'border-gray-200 bg-white hover:border-purple-200',
    activeBg: 'bg-purple-50',
    activeBorder: 'border-purple-400',
    textColor: 'text-purple-600',
    countColor: 'text-purple-700',
  },
  declined: {
    label: 'Declined',
    subtitle: 'Contact passed',
    color: 'border-gray-200 bg-white hover:border-red-200',
    activeBg: 'bg-red-50',
    activeBorder: 'border-red-400',
    textColor: 'text-red-500',
    countColor: 'text-red-600',
  },
  no_response: {
    label: 'No Reply',
    subtitle: 'No response received',
    color: 'border-gray-200 bg-white hover:border-gray-300',
    activeBg: 'bg-gray-50',
    activeBorder: 'border-gray-400',
    textColor: 'text-gray-500',
    countColor: 'text-gray-600',
  },
};

const STATUS_CONTEXT: Record<string, string> = {
  pending: 'New request — reach out to the hiring contact',
  contacted: 'Outreach sent — waiting for hiring contact to accept/decline via email',
  accepted: 'Contact said yes! Time to send the introduction',
  connected: 'Introduction emails sent to both sides',
  followed_up: '"How did it go?" check-in sent',
  declined: 'Contact passed — requester has been notified',
  no_response: "Closed — hiring contact didn't respond",
};

const CARD_BORDER: Record<string, string> = {
  pending: 'border-l-amber-400',
  contacted: 'border-l-blue-400',
  accepted: 'border-l-teal-400',
  connected: 'border-l-emerald-400',
  followed_up: 'border-l-purple-400',
  declined: 'border-l-red-300',
  no_response: 'border-l-gray-300',
};

const BADGE_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  contacted: 'bg-blue-50 text-blue-700',
  accepted: 'bg-teal-50 text-teal-700',
  connected: 'bg-emerald-50 text-emerald-700',
  followed_up: 'bg-purple-50 text-purple-700',
  declined: 'bg-red-50 text-red-600',
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
    case 'contacted': {
      const lines = [
        `Will email ${intro.introName}: "I'm reaching out to ${intro.jobCompany} on your behalf"`,
        `Will email hiring contact: Outreach with accept/decline buttons`,
      ];
      if (intro.currentStatus === 'declined' || intro.currentStatus === 'no_response') {
        lines.push('Note: If these emails were already sent, dedup will silently skip them');
      }
      return lines;
    }
    case 'accepted':
      return [
        'Note: When a contact clicks "Accept", intros are sent automatically and status moves to Introduced. This status only appears if auto-connect failed (e.g. no contact email on file).',
      ];
    case 'connected':
      return [
        `Will email ${intro.introName}: Introduction to the hiring contact`,
        `Will email the hiring contact: Introduction to ${intro.introName}`,
      ];
    case 'followed_up':
      return [`Will email ${intro.introName}: "How did it go with ${intro.jobCompany}?"`];
    case 'declined':
      return [`Will email ${intro.introName}: "They passed — here are other roles"`];
    case 'no_response':
      return [`Will email ${intro.introName}: "Sorry, no response from ${intro.jobCompany}"`];
    case 'pending':
      if (intro.currentStatus !== 'pending') {
        return [
          'No new emails — reverting to pending',
          'Note: Previously sent emails will not re-send if you move forward again (dedup prevents duplicates)',
        ];
      }
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

  // Follow-up modal (replaces window.confirm)
  const [followUpModal, setFollowUpModal] = useState<{
    id: string;
    name: string;
    company: string;
  } | null>(null);
  const [followUpLoading, setFollowUpLoading] = useState(false);

  // Toast for email send results
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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
      setError(err instanceof Error ? err.message : 'Failed to load connection requests');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchIntros();
  }, [fetchIntros]);

  useEffect(() => {
    document.title = 'Connection Requests | Admin';
  }, []);

  // ─── Computed data ───

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of STATUS_ORDER) c[s] = 0;
    for (const intro of allIntros) {
      if (intro.status in c) c[intro.status]++;
      else c[intro.status] = 1;
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
    if (newStatus === 'connected' || newStatus === 'contacted') {
      setContactName(intro.job_submitter_name || '');
      setContactEmail(intro.job_submitter_email || '');
      setContactRole('');
    }
  };

  const confirmStatusChange = async () => {
    if (!token || !confirmModal) return;
    if (
      (confirmModal.newStatus === 'connected' || confirmModal.newStatus === 'contacted') &&
      (!contactName.trim() || !contactEmail.trim())
    ) {
      setError('Contact name and email are required.');
      return;
    }
    setConfirmLoading(true);
    try {
      const extra =
        confirmModal.newStatus === 'connected' || confirmModal.newStatus === 'contacted'
          ? {
              contact_name: contactName.trim(),
              contact_email: contactEmail.trim(),
              contact_role: contactRole.trim() || undefined,
            }
          : undefined;
      const result = await updateWarmIntroStatus(
        token,
        confirmModal.introId,
        confirmModal.newStatus,
        extra,
      );
      setAllIntros((prev) =>
        prev.map((intro) =>
          intro.id === confirmModal.introId ? { ...intro, status: confirmModal.newStatus } : intro,
        ),
      );
      // Show toast based on actual email results from API
      const emails = result.emails || [];
      const sent = emails.filter((e) => e.status === 'sent').length;
      const skipped = emails.filter((e) => e.status === 'skipped');
      const failed = emails.filter((e) => e.status === 'failed');

      if (failed.length > 0) {
        setToast({
          message: `Status updated but ${failed.length} email${failed.length !== 1 ? 's' : ''} failed: ${failed.map((e) => e.error || e.type).join(', ')}`,
          type: 'error',
        });
        setTimeout(() => setToast(null), 6000);
      } else if (skipped.length > 0 && skipped.some((e) => !e.error?.includes('dedup'))) {
        const warnings = skipped.filter((e) => !e.error?.includes('dedup'));
        setToast({
          message: `Status updated — ${warnings[0]?.error || 'An email was skipped'}`,
          type: 'error',
        });
        setTimeout(() => setToast(null), 6000);
      } else {
        setToast({
          message:
            sent > 0
              ? `Status updated — ${sent} email${sent !== 1 ? 's' : ''} sent`
              : `Status updated to ${STATUS_LABELS[confirmModal.newStatus] || confirmModal.newStatus}`,
          type: 'success',
        });
        setTimeout(() => setToast(null), 4000);
      }
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

  const requestFollowUp = (intro: WarmIntroRecord) => {
    setFollowUpModal({
      id: intro.id,
      name: intro.name,
      company: intro.job_company || 'the company',
    });
  };

  const confirmFollowUp = async () => {
    if (!token || !followUpModal) return;
    setFollowUpLoading(true);
    try {
      await sendIntroFollowUp(token, followUpModal.id);
      setError(null);
      setToast({ message: 'Follow-up email sent', type: 'success' });
      setTimeout(() => setToast(null), 4000);
      setFollowUpModal(null);
      if (expandedTrail === followUpModal.id && emailLogs[followUpModal.id]) {
        setTimeout(() => fetchEmailLogs(followUpModal.id), 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send follow-up');
    } finally {
      setFollowUpLoading(false);
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
          <h1 className="text-2xl font-bold text-gray-900">Connection Requests</h1>
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

      {/* How This Works */}
      <HowItWorks />

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
              onFollowUp={requestFollowUp}
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

            {/* Contact info for "contacted" */}
            {confirmModal.newStatus === 'contacted' && (
              <div className="space-y-3 rounded-xl bg-gray-50 border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Send outreach to
                  </p>
                  {(confirmModal.jobSubmitterName || confirmModal.jobSubmitterEmail) && (
                    <span className="text-[10px] text-gray-400">Pre-filled from job submitter</span>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Contact Name *</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                    placeholder="e.g. Sarah Chen"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Contact Email *</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                    placeholder="sarah@company.com"
                  />
                </div>
                {(!contactName.trim() || !contactEmail.trim()) && (
                  <p className="text-xs text-amber-600">
                    Contact name and email needed to send the outreach email.
                  </p>
                )}
              </div>
            )}

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
                  ((confirmModal.newStatus === 'connected' ||
                    confirmModal.newStatus === 'contacted') &&
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

      {/* ─── Follow-up Confirmation Modal ─── */}
      {followUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 border-l-4 border-l-purple-400">
            <h3 className="text-lg font-bold text-gray-900">Send Follow-up</h3>
            <p className="text-sm text-gray-600">
              Send a "How did it go?" check-in email to <strong>{followUpModal.name}</strong> about
              their intro to {followUpModal.company}?
            </p>
            <div className="rounded-xl bg-purple-50 border border-purple-200 p-3">
              <p className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider">
                Email that will send
              </p>
              <p className="text-sm text-purple-800 mt-1">
                Will email {followUpModal.name}: "How did it go with {followUpModal.company}?"
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setFollowUpModal(null)}
                className="flex-1 text-sm px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmFollowUp}
                disabled={followUpLoading}
                className="flex-1 text-sm px-4 py-2.5 rounded-xl font-semibold bg-purple-500 text-white hover:bg-purple-600 transition-colors disabled:opacity-40"
              >
                {followUpLoading ? 'Sending...' : 'Send Follow-up'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Toast ─── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-xl shadow-lg px-4 py-3 text-sm font-medium transition-all ${
            toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
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

      {/* Pipeline segments — top row: active flow, bottom row: terminal states */}
      <div className="space-y-2">
        {/* Active flow: pending → contacted → accepted → connected */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {(['pending', 'contacted', 'accepted', 'connected'] as const).map((status, idx) => {
            const cfg = PIPELINE_CONFIG[status];
            const isActive = activeFilter === status;
            const count = counts[status] || 0;

            return (
              <div key={status} className="relative flex items-center">
                <button
                  onClick={() => onFilter(isActive ? '' : status)}
                  className={`w-full rounded-xl border-2 p-3 text-left transition-all ${
                    isActive ? `${cfg.activeBg} ${cfg.activeBorder} shadow-sm` : cfg.color
                  }`}
                >
                  <p
                    className={`text-[11px] font-semibold uppercase tracking-wider ${cfg.textColor}`}
                  >
                    {cfg.label}
                  </p>
                  <p className={`text-2xl font-bold mt-1 ${cfg.countColor}`}>{count}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{cfg.subtitle}</p>
                </button>
                {idx < 3 && (
                  <span className="hidden lg:block absolute -right-2 z-10 text-gray-300 text-sm">
                    ›
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {/* Terminal states: followed_up, declined, no_response */}
        <div className="grid grid-cols-3 gap-2">
          {(['followed_up', 'declined', 'no_response'] as const).map((status) => {
            const cfg = PIPELINE_CONFIG[status];
            const isActive = activeFilter === status;
            const count = counts[status] || 0;

            return (
              <button
                key={status}
                onClick={() => onFilter(isActive ? '' : status)}
                className={`rounded-xl border-2 p-3 text-left transition-all ${
                  isActive ? `${cfg.activeBg} ${cfg.activeBorder} shadow-sm` : cfg.color
                }`}
              >
                <p
                  className={`text-[10px] font-semibold uppercase tracking-wider ${cfg.textColor}`}
                >
                  {cfg.label}
                </p>
                <p className={`text-xl font-bold mt-0.5 ${cfg.countColor}`}>{count}</p>
                <p className="text-[10px] text-gray-400">{cfg.subtitle}</p>
              </button>
            );
          })}
        </div>
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
  onFollowUp: (intro: WarmIntroRecord) => void;
  emailTrailExpanded: boolean;
  onToggleTrail: () => void;
  emailLogs?: EmailLog[];
  loadingLogs: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 border-l-4 ${CARD_BORDER[intro.status] || CARD_BORDER.pending} ${intro.needs_reminder ? 'ring-2 ring-red-200' : intro.is_stale ? 'ring-1 ring-amber-200' : ''}`}
    >
      <div className="p-5 space-y-3">
        {/* Step tracker + context */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <StepTracker currentStatus={intro.status} />
            <p className="text-xs text-gray-500 italic">{STATUS_CONTEXT[intro.status]}</p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-[11px] text-gray-400">
              {getRelativeTimeLabel(intro.created_at)}
            </span>
            {intro.needs_reminder ? (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-red-100 text-red-700">
                {intro.days_in_status}d — auto-reminder sent, needs action
              </span>
            ) : intro.is_stale ? (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700">
                {intro.days_in_status}d — nudge email sent
              </span>
            ) : null}
          </div>
        </div>

        {/* Human-story headline */}
        <p className="text-sm font-medium text-gray-800">
          <span className="font-semibold">{intro.name}</span>
          {' wants to be introduced to '}
          <span className="font-semibold">{intro.job_company}</span>
          {intro.job_title ? ` for the ${intro.job_title} role` : ''}
        </p>

        {/* Next step guidance */}
        <NextStepGuidance intro={intro} />

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
              Hiring Contact
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
              <p className="text-xs text-gray-400 italic">No contact info on file</p>
            )}
            {intro.contact_response && (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  intro.contact_response === 'accepted'
                    ? 'bg-emerald-100 text-emerald-700'
                    : intro.contact_response === 'declined'
                      ? 'bg-red-100 text-red-600'
                      : 'bg-amber-100 text-amber-700'
                }`}
              >
                {intro.contact_response === 'accepted'
                  ? 'Said yes'
                  : intro.contact_response === 'declined'
                    ? 'Passed'
                    : 'Wants more info'}
              </span>
            )}
            {!intro.contact_response && intro.status === 'contacted' && intro.response_token && (
              <button
                onClick={() => {
                  const url = `${window.location.origin}/intro-response?token=${intro.response_token}`;
                  navigator.clipboard.writeText(url);
                  const el = document.getElementById(`copy-${intro.id}`);
                  if (el) {
                    el.textContent = 'Copied!';
                    setTimeout(() => {
                      if (el) el.textContent = 'Copy response link';
                    }, 2000);
                  }
                }}
                id={`copy-${intro.id}`}
                className="text-[10px] text-purple-500 hover:text-purple-700 hover:underline transition-colors"
              >
                Copy response link
              </button>
            )}
          </div>
        </div>

        {/* Message (if any) */}
        {intro.message && <MessageBlock label="Requester's note" text={intro.message} />}

        {/* Contact response (from hiring contact via accept/decline page) */}
        {intro.contact_response && (
          <ContactResponseBlock
            response={intro.contact_response}
            note={intro.contact_note}
            respondedAt={intro.contact_responded_at}
            contactName={intro.job_submitter_name}
          />
        )}

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
            {intro.last_email_at && intro.email_types?.length > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                {EVENT_SHORT[intro.email_types[intro.email_types.length - 1]] ||
                  intro.email_types[intro.email_types.length - 1]}{' '}
                {getRelativeTimeLabel(intro.last_email_at)}
              </span>
            )}
            {intro.last_email_at && (!intro.email_types || intro.email_types.length === 0) && (
              <span>Last: {getRelativeTimeLabel(intro.last_email_at)}</span>
            )}
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

function MessageBlock({ text, label }: { text: string; label?: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 120;
  const display = isLong && !expanded ? text.slice(0, 120) + '...' : text;

  return (
    <div className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2.5">
      {label && (
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
          {label}
        </p>
      )}
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

// ─── Contact Response Block ───

const RESPONSE_CONFIG: Record<string, { label: string; bg: string; border: string; icon: string }> =
  {
    accepted: {
      label: 'Accepted',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      icon: '✓',
    },
    declined: {
      label: 'Declined',
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: '✕',
    },
    more_info: {
      label: 'Wants more info',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: '?',
    },
  };

function ContactResponseBlock({
  response,
  note,
  respondedAt,
  contactName,
}: {
  response: string;
  note: string | null;
  respondedAt: string | null;
  contactName: string | null;
}) {
  const cfg = RESPONSE_CONFIG[response] || {
    label: response,
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    icon: '·',
  };

  return (
    <div className={`rounded-lg ${cfg.bg} border ${cfg.border} px-3 py-2.5 space-y-1`}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
          Contact Response
        </p>
        {respondedAt && (
          <span className="text-[10px] text-gray-400">{getRelativeTimeLabel(respondedAt)}</span>
        )}
      </div>
      <p className="text-sm font-medium text-gray-800">
        <span className="mr-1.5">{cfg.icon}</span>
        {contactName || 'Hiring contact'} {cfg.label.toLowerCase()}
        {response === 'more_info' ? '' : ' this intro'}
      </p>
      {note && <p className="text-sm text-gray-600 italic mt-1">&ldquo;{note}&rdquo;</p>}
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
  onFollowUp: (intro: WarmIntroRecord) => void;
}) {
  switch (intro.status) {
    case 'pending':
      return (
        <button
          onClick={() => onStatusChange(intro, 'contacted')}
          className="text-xs px-3.5 py-2 rounded-lg font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors flex flex-col items-center"
        >
          <span>Reach Out to Contact</span>
          <span className="text-[10px] font-normal opacity-80">
            Sends outreach email with accept/decline buttons
          </span>
        </button>
      );
    case 'contacted':
      return (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => onStatusChange(intro, 'connected')}
            className="text-xs px-3.5 py-2 rounded-lg font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-colors flex flex-col items-center"
          >
            <span>Send Introduction</span>
            <span className="text-[10px] font-normal opacity-80">Skip accept — send intro now</span>
          </button>
          <button
            onClick={() => onStatusChange(intro, 'declined')}
            className="text-xs px-3.5 py-2 rounded-lg font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors flex flex-col items-center"
          >
            <span>Mark Declined</span>
            <span className="text-[10px] font-normal opacity-70">Contact passed</span>
          </button>
          <button
            onClick={() => onStatusChange(intro, 'no_response')}
            className="text-xs px-3.5 py-2 rounded-lg font-medium bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"
          >
            No Response
          </button>
        </div>
      );
    case 'accepted':
      return (
        <button
          onClick={() => onStatusChange(intro, 'connected')}
          className="text-xs px-3.5 py-2 rounded-lg font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-colors flex flex-col items-center"
        >
          <span>Send Introduction Emails</span>
          <span className="text-[10px] font-normal opacity-80">Both sides get the intro email</span>
        </button>
      );
    case 'connected':
      return (
        <button
          onClick={() => onFollowUp(intro)}
          className="text-xs px-3.5 py-2 rounded-lg font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors flex flex-col items-center"
        >
          <span>Send Follow-up</span>
          <span className="text-[10px] font-normal opacity-70">"How did it go?"</span>
        </button>
      );
    case 'followed_up':
      return <span className="text-xs text-purple-500 italic">Check-in sent — awaiting reply</span>;
    case 'declined':
    case 'no_response':
      return <span className="text-xs text-gray-400 italic">This intro is closed</span>;
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
    options.push({ status: 'pending', label: '\u2190 Back to Pending' });
  }
  if (intro.status === 'accepted') {
    options.push({ status: 'contacted', label: '\u2190 Back to Contacted' });
  }
  if (intro.status === 'connected') {
    options.push({ status: 'accepted', label: '\u2190 Back to Accepted' });
  }
  if (intro.status === 'followed_up') {
    options.push({ status: 'connected', label: '\u2190 Back to Connected' });
  }
  if (intro.status === 'declined') {
    options.push({ status: 'contacted', label: '\u2190 Reopen' });
  }
  if (intro.status === 'no_response') {
    options.push({ status: 'contacted', label: '\u2190 Retry' });
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
  warm_intro_contacted: '"I\'m on it" → requester',
  warm_intro_outreach_contact: 'Outreach → hiring contact',
  warm_intro_contact_nudge: 'Nudge → hiring contact',
  warm_intro_accepted_admin: 'Contact accepted → admin',
  warm_intro_declined_admin: 'Contact declined → admin',
  warm_intro_more_info_admin: 'More info needed → admin',
  warm_intro_accepted_requester: '"They said yes!" → requester',
  warm_intro_declined_requester: '"They passed" → requester',
  warm_intro_connection_requester: 'Intro email → requester',
  warm_intro_connection_contact: 'Intro email → hiring contact',
  warm_intro_no_response: 'No response → requester',
  warm_intro_follow_up: 'Follow-up → requester',
  warm_intro_accepted_nudge: 'Accepted nudge → admin',
  warm_intro_nudge_day5: 'Day 5 nudge → admin',
  warm_intro_nudge_day10: 'Day 10 nudge → admin',
  warm_intro_requester_update_day5: 'Day 5 update → requester',
  warm_intro_requester_update_day10: 'Day 10 update → requester',
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

// ─── How It Works ───

function HowItWorks() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem('fc_intros_how_dismissed') === '1';
    } catch {
      return false;
    }
  });

  if (dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem('fc_intros_how_dismissed', '1');
    } catch {
      // non-critical
    }
  };

  return (
    <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50/60 p-4 relative">
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 text-blue-400 hover:text-blue-600 text-xs"
        aria-label="Dismiss"
      >
        ✕
      </button>
      <p className="text-xs font-semibold text-blue-700 mb-3 uppercase tracking-wider">
        How Connection Requests Work
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="flex items-center gap-2">
          <span className="h-7 w-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold shrink-0">
            1
          </span>
          <span className="text-sm text-gray-700">Request comes in</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
            2
          </span>
          <span className="text-sm text-gray-700">You send outreach (with accept/decline)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-7 w-7 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold shrink-0">
            3
          </span>
          <span className="text-sm text-gray-700">Contact accepts</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
            4
          </span>
          <span className="text-sm text-gray-700">Both sides get intro emails</span>
        </div>
      </div>
    </div>
  );
}

// ─── Empty State ───

function EmptyState({ filter }: { filter: string }) {
  const messages: Record<string, string> = {
    pending: 'No new requests. Check back later.',
    contacted: 'No requests waiting on responses.',
    accepted: 'No accepted requests waiting for intro.',
    connected: 'No completed introductions yet.',
    followed_up: 'No follow-ups sent yet.',
    declined: 'No declined requests. Nice.',
    no_response: 'No dead ends. Nice.',
  };

  return (
    <div className="text-center py-16">
      <div className="text-4xl mb-3">🤝</div>
      <p className="text-sm text-gray-500">
        {filter
          ? messages[filter] || 'No intro requests with this status.'
          : 'No connection requests yet.'}
      </p>
    </div>
  );
}

// ─── Step Tracker ───

const STEP_FLOW = ['pending', 'contacted', 'accepted', 'connected'] as const;
const STEP_COLORS: Record<string, { fill: string; ring: string }> = {
  pending: { fill: 'bg-amber-500', ring: 'ring-amber-200' },
  contacted: { fill: 'bg-blue-500', ring: 'ring-blue-200' },
  accepted: { fill: 'bg-teal-500', ring: 'ring-teal-200' },
  connected: { fill: 'bg-emerald-500', ring: 'ring-emerald-200' },
  followed_up: { fill: 'bg-purple-500', ring: 'ring-purple-200' },
  declined: { fill: 'bg-red-400', ring: 'ring-red-200' },
  no_response: { fill: 'bg-gray-400', ring: 'ring-gray-200' },
};

function StepTracker({ currentStatus }: { currentStatus: string }) {
  const isTerminal =
    currentStatus === 'declined' ||
    currentStatus === 'no_response' ||
    currentStatus === 'followed_up';
  const currentIdx = isTerminal
    ? currentStatus === 'followed_up'
      ? 4
      : currentStatus === 'declined'
        ? 1
        : 1
    : STEP_FLOW.indexOf(currentStatus as (typeof STEP_FLOW)[number]);

  return (
    <div className="flex items-center gap-1">
      {STEP_FLOW.map((step, idx) => {
        const isDone = !isTerminal
          ? idx < currentIdx
          : currentStatus === 'followed_up'
            ? idx <= 3
            : idx < (currentStatus === 'declined' ? 2 : 1);
        const isCurrent = !isTerminal && idx === currentIdx;
        const colors = STEP_COLORS[step];

        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                  isDone
                    ? `${colors.fill} text-white`
                    : isCurrent
                      ? `${colors.fill} text-white ring-2 ${colors.ring}`
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {isDone ? (
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={`text-[9px] mt-0.5 ${isCurrent ? 'font-semibold text-gray-700' : 'text-gray-400'}`}
              >
                {PIPELINE_CONFIG[step]?.label}
              </span>
            </div>
            {idx < STEP_FLOW.length - 1 && (
              <div
                className={`h-0.5 w-5 mx-0.5 mb-3 ${isDone ? STEP_COLORS[STEP_FLOW[idx + 1]].fill : 'bg-gray-200'}`}
              />
            )}
          </div>
        );
      })}

      {/* Terminal branch indicator */}
      {isTerminal && (
        <div className="flex items-center ml-1">
          <div className="h-0.5 w-3 bg-gray-300 mb-3" style={{ borderTop: '1px dashed' }} />
          <div className="flex flex-col items-center">
            <div
              className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] ${STEP_COLORS[currentStatus]?.fill || 'bg-gray-400'} text-white ring-2 ${STEP_COLORS[currentStatus]?.ring || 'ring-gray-200'}`}
            >
              {currentStatus === 'followed_up' ? '?' : '✕'}
            </div>
            <span className="text-[9px] mt-0.5 font-semibold text-gray-600">
              {STATUS_LABELS[currentStatus]}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Next Step Guidance ───

function NextStepGuidance({ intro }: { intro: WarmIntroRecord }) {
  const submitter = intro.job_submitter_name || intro.job_company;

  let msg = '';
  let isAction = false;
  let isDone = false;

  switch (intro.status) {
    case 'pending':
      msg = `Next: Reach out to ${submitter} about introducing ${intro.name}`;
      isAction = true;
      break;
    case 'contacted':
      if (intro.contact_response === 'more_info') {
        msg = `${submitter} wants more info before deciding. Follow up with them directly.`;
        isAction = true;
      } else {
        msg = `Waiting for ${submitter} to accept or decline via email link`;
      }
      break;
    case 'accepted':
      msg = `${submitter} said yes! Send the introduction emails now`;
      isAction = true;
      break;
    case 'connected':
      msg = 'Both sides introduced. Send a follow-up in a few days to check in.';
      break;
    case 'followed_up':
      msg = 'Check-in sent — waiting for reply';
      isDone = true;
      break;
    case 'declined':
      msg = 'Contact passed. Requester has been notified.';
      isDone = true;
      break;
    case 'no_response':
      msg = 'This intro is closed — no response from hiring contact.';
      isDone = true;
      break;
  }

  if (!msg) return null;

  return (
    <p
      className={`text-xs px-2.5 py-1.5 rounded-md ${
        isAction
          ? 'bg-brand-50 text-brand-700 font-medium'
          : isDone
            ? 'bg-gray-50 text-gray-500'
            : 'bg-blue-50 text-blue-700'
      }`}
    >
      {msg}
    </p>
  );
}
