import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { getAdminJobs, updateJobStatus, updateJob } from '../../lib/api';
import type { Job } from '../../lib/types';
import { getRelativeTimeLabel } from '../../lib/date';

function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border border-amber-200',
    active: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    rejected: 'bg-red-50 text-red-700 border border-red-200',
    archived: 'bg-gray-100 text-gray-500 border border-gray-200',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${classes[status] || 'bg-gray-100 text-gray-500'}`}
    >
      {status}
    </span>
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

export default function JobsPage() {
  const { token } = useAdminAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') || 'pending';

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const fetchJobs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getAdminJobs(token, statusFilter === 'all' ? undefined : statusFilter);
      setJobs(result.jobs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    document.title = 'Jobs | Admin';
  }, []);

  const changeStatus = async (jobId: string, status: string) => {
    if (!token) return;
    const job = jobs.find((j) => j.id === jobId);
    const label = status === 'active' ? 'approve' : status === 'rejected' ? 'reject' : 'archive';
    if (!window.confirm(`Are you sure you want to ${label} "${job?.title || 'this job'}"?`)) return;
    try {
      await updateJobStatus(token, jobId, status);
      fetchJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const toggleFeature = async (job: Job, field: 'featured' | 'pinned') => {
    if (!token) return;
    try {
      await updateJob(token, job.id, { [field]: !job[field] } as Partial<Job>);
      fetchJobs();
    } catch {
      // silent
    }
  };

  const [confirmAction, setConfirmAction] = useState<{
    status: string;
    jobIds: string[];
    titles: string[];
  } | null>(null);

  const handleBulkAction = (status: string) => {
    if (selectedIds.size === 0) return;
    const affected = displayJobs.filter((j) => selectedIds.has(j.id));
    setConfirmAction({
      status,
      jobIds: affected.map((j) => j.id),
      titles: affected.map((j) => `${j.title} (${j.company})`),
    });
  };

  const executeBulkAction = async () => {
    if (!token || !confirmAction) return;
    setBulkLoading(true);
    try {
      await Promise.all(
        confirmAction.jobIds.map((id) => updateJobStatus(token, id, confirmAction.status)),
      );
      setSelectedIds(new Set());
      setConfirmAction(null);
      fetchJobs();
    } finally {
      setBulkLoading(false);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'title',
      'company',
      'location',
      'status',
      'salary_range',
      'employment_type',
      'work_arrangement',
      'posted_date',
      'submitter_email',
    ];
    const rows = displayJobs.map((j) =>
      headers
        .map((h) => {
          const val = j[h as keyof Job];
          return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : String(val ?? '');
        })
        .join(','),
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jobs-${statusFilter}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const setStatus = (s: string) => {
    setSearchParams({ status: s });
    setSelectedIds(new Set());
  };

  const filtered = searchQuery.trim()
    ? jobs.filter((j) => {
        const q = searchQuery.toLowerCase();
        return (
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          (j.location?.toLowerCase().includes(q) ?? false) ||
          (j.submitter_email?.toLowerCase().includes(q) ?? false) ||
          (j.submission_ref?.toLowerCase().includes(q) ?? false)
        );
      })
    : jobs;
  const displayJobs = sortJobs(filtered, sortKey);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="p-6 lg:p-8 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage all job listings</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="text-xs px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors inline-flex items-center gap-1.5"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            Export
          </button>
          <Link
            to="/admin/jobs/new"
            className="text-xs px-3 py-2 rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors inline-flex items-center gap-1.5"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Job
          </Link>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
        {['pending', 'active', 'rejected', 'archived', 'all'].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all capitalize ${
              statusFilter === s
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Search + sort */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
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
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, company, location, email..."
            className="w-full rounded-lg border border-gray-200 bg-white pl-10 pr-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300"
          />
        </div>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="company">Company A-Z</option>
          <option value="title">Title A-Z</option>
        </select>
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-brand-50 border border-brand-200/60 p-3">
          <span className="text-xs font-semibold text-brand-700">{selectedIds.size} selected</span>
          <button
            onClick={() => handleBulkAction('active')}
            disabled={bulkLoading}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
          >
            Approve
          </button>
          <button
            onClick={() => handleBulkAction('rejected')}
            disabled={bulkLoading}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
          >
            Reject
          </button>
          <button
            onClick={() => handleBulkAction('archived')}
            disabled={bulkLoading}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
          >
            Archive
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-gray-500 hover:text-gray-700 ml-auto"
          >
            Clear
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Job list */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 bg-gray-200 rounded" />
                <div className="flex-1">
                  <div className="h-4 w-48 bg-gray-200 rounded mb-2" />
                  <div className="h-3 w-32 bg-gray-100 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : displayJobs.length === 0 ? (
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
              d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z"
            />
          </svg>
          <p className="text-sm text-gray-500">
            {searchQuery ? 'No jobs match your search.' : 'No jobs with this status.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Select all */}
          <div className="flex items-center gap-2 px-1 py-1">
            <input
              type="checkbox"
              checked={selectedIds.size === displayJobs.length && displayJobs.length > 0}
              onChange={() => {
                if (selectedIds.size === displayJobs.length) setSelectedIds(new Set());
                else setSelectedIds(new Set(displayJobs.map((j) => j.id)));
              }}
              className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            />
            <span className="text-xs text-gray-500">{displayJobs.length} jobs</span>
          </div>

          {/* Bulk action confirmation modal */}
          {confirmAction && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => setConfirmAction(null)}
              />
              <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Confirm Bulk{' '}
                  {confirmAction.status === 'active'
                    ? 'Approve'
                    : confirmAction.status === 'rejected'
                      ? 'Reject'
                      : 'Archive'}
                </h2>
                <p className="text-sm text-gray-600">
                  This will{' '}
                  {confirmAction.status === 'active'
                    ? 'approve'
                    : confirmAction.status === 'rejected'
                      ? 'reject'
                      : 'archive'}{' '}
                  <strong>{confirmAction.jobIds.length}</strong> job
                  {confirmAction.jobIds.length > 1 ? 's' : ''}:
                </p>
                <ul className="text-xs text-gray-500 max-h-40 overflow-y-auto space-y-1">
                  {confirmAction.titles.map((t, i) => (
                    <li key={i} className="truncate">
                      • {t}
                    </li>
                  ))}
                </ul>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setConfirmAction(null)}
                    className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executeBulkAction}
                    disabled={bulkLoading}
                    className={`text-sm px-4 py-2 rounded-lg text-white disabled:opacity-50 ${
                      confirmAction.status === 'rejected'
                        ? 'bg-red-600 hover:bg-red-700'
                        : confirmAction.status === 'active'
                          ? 'bg-emerald-600 hover:bg-emerald-700'
                          : 'bg-gray-600 hover:bg-gray-700'
                    }`}
                  >
                    {bulkLoading ? 'Processing...' : 'Confirm'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {displayJobs.map((job) => (
            <div
              key={job.id}
              className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
            >
              <div className="p-4 flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(job.id)}
                  onChange={() => toggleSelect(job.id)}
                  className="mt-1 rounded border-gray-300 text-brand-500 focus:ring-brand-500 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      to={`/admin/jobs/${job.id}`}
                      className="text-sm font-semibold text-gray-900 hover:text-brand-600 transition-colors truncate"
                    >
                      {job.title}
                    </Link>
                    <StatusBadge status={job.status} />
                    {job.pinned && (
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 border border-blue-200">
                        Pinned
                      </span>
                    )}
                    {job.featured && (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200">
                        Featured
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {job.company} · {job.location || 'No location'} ·{' '}
                    {getRelativeTimeLabel(job.created_at)}
                  </p>
                  {job.submitter_email && (
                    <p className="text-xs text-gray-400 mt-0.5">{job.submitter_email}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => toggleFeature(job, 'pinned')}
                    className={`text-[11px] px-2 py-1 rounded-md transition-colors ${job.pinned ? 'bg-blue-100 text-blue-700' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
                  >
                    {job.pinned ? 'Unpin' : 'Pin'}
                  </button>
                  <button
                    onClick={() => toggleFeature(job, 'featured')}
                    className={`text-[11px] px-2 py-1 rounded-md transition-colors ${job.featured ? 'bg-amber-100 text-amber-700' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
                  >
                    {job.featured ? 'Unfeature' : 'Feature'}
                  </button>
                  <Link
                    to={`/admin/jobs/${job.id}`}
                    className="text-[11px] px-2 py-1 rounded-md bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Edit
                  </Link>
                  {job.status !== 'active' && (
                    <button
                      onClick={() => changeStatus(job.id, 'active')}
                      className="text-[11px] px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                    >
                      Approve
                    </button>
                  )}
                  {job.status !== 'rejected' && (
                    <button
                      onClick={() => changeStatus(job.id, 'rejected')}
                      className="text-[11px] px-2 py-1 rounded-md bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                    >
                      Reject
                    </button>
                  )}
                  {job.status !== 'archived' && (
                    <button
                      onClick={() => changeStatus(job.id, 'archived')}
                      className="text-[11px] px-2 py-1 rounded-md bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                    >
                      Archive
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
