import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { getAnalytics, getExternalAnalytics, getRuntime } from '../../lib/api';
import type { AnalyticsData, ExternalAnalytics } from '../../lib/api';
import type { RuntimeInfo } from '../../lib/types';

function StatCard({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
        {icon}
      </div>
      <p className={`text-3xl font-bold mt-1 ${color || 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function MiniChart({
  data,
  color,
  label,
}: {
  data: { date: string; count: number }[];
  color: string;
  label: string;
}) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{label}</h4>
      <div className="flex items-end gap-[2px] h-20">
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

function HealthDot({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-block h-2 w-2 rounded-full ${ok ? 'bg-emerald-500' : 'bg-red-500'}`} />
  );
}

function ProviderBadge({ name, configured }: { name: string; configured: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${
        configured
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'bg-gray-50 text-gray-400 border border-gray-200'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${configured ? 'bg-emerald-500' : 'bg-gray-300'}`}
      />
      {name}
    </span>
  );
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function DashboardPage() {
  const { token } = useAdminAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [external, setExternal] = useState<ExternalAnalytics | null>(null);
  const [runtime, setRuntime] = useState<RuntimeInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [a, r] = await Promise.all([getAnalytics(token), getRuntime(token)]);
      setAnalytics(a);
      setRuntime(r);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
    // Fetch external analytics separately (slower, non-blocking)
    try {
      const ext = await getExternalAnalytics(token);
      setExternal(ext);
    } catch {
      // non-critical
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    document.title = 'Dashboard | Admin';
  }, []);

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="h-3 w-16 bg-gray-200 rounded mb-3" />
              <div className="h-8 w-20 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Overview of your job board</p>
        </div>
        <div className="flex items-center gap-2">
          {external && (
            <div className="hidden lg:flex items-center gap-1.5">
              <ProviderBadge name="PostHog" configured={external.configured.posthog} />
              <ProviderBadge name="Sentry" configured={external.configured.sentry} />
              <ProviderBadge name="Vercel" configured={external.configured.vercel} />
              <ProviderBadge name="GA4" configured={external.configured.ga4} />
            </div>
          )}
          <button
            onClick={fetchData}
            className="text-xs px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Primary stat cards — internal data */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Jobs"
          value={analytics?.statusCounts.active || 0}
          color="text-emerald-600"
        />
        <StatCard
          label="Pending Review"
          value={analytics?.statusCounts.pending || 0}
          color="text-amber-600"
        />
        <StatCard
          label="Clicks (30d)"
          value={analytics?.totals.clicks30d || 0}
          color="text-brand-600"
        />
        <StatCard
          label="Warm Intros (30d)"
          value={analytics?.totals.intros30d || 0}
          color="text-accent-pink"
        />
      </div>

      {/* External analytics — PostHog traffic */}
      {external?.posthog && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Pageviews (7d)"
            value={external.posthog.pageviews7d.toLocaleString()}
            color="text-blue-600"
            sub="PostHog"
            icon={
              <svg
                className="h-4 w-4 text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            }
          />
          <StatCard
            label="Unique Users (7d)"
            value={external.posthog.uniqueUsers7d.toLocaleString()}
            color="text-violet-600"
            sub="PostHog"
            icon={
              <svg
                className="h-4 w-4 text-violet-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                />
              </svg>
            }
          />
          <StatCard
            label="Sessions (7d)"
            value={external.posthog.sessionCount7d.toLocaleString()}
            color="text-indigo-600"
            sub="PostHog"
          />
          {external.sentry ? (
            <StatCard
              label="Errors (7d)"
              value={external.sentry.errors7d}
              color={external.sentry.errors7d > 10 ? 'text-red-600' : 'text-emerald-600'}
              sub={`${external.sentry.unresolvedIssues} unresolved · Sentry`}
              icon={
                <svg
                  className="h-4 w-4 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              }
            />
          ) : (
            <StatCard label="Errors" value="—" sub="Sentry not configured" color="text-gray-400" />
          )}
        </div>
      )}

      {/* Charts */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <MiniChart
            data={analytics.clicksByDay}
            color="rgb(99 91 255)"
            label="Apply Clicks — Last 30 Days"
          />
          <MiniChart
            data={analytics.introsByDay}
            color="rgb(255 59 139)"
            label="Warm Intros — Last 30 Days"
          />
        </div>
      )}

      {/* PostHog top pages + Vercel deployment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Pages */}
        {external?.posthog && external.posthog.topPages.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Top Pages (7d) — PostHog
            </h3>
            <div className="space-y-2">
              {external.posthog.topPages.map((page, i) => {
                const maxViews = external.posthog!.topPages[0]?.views || 1;
                return (
                  <div key={page.path} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-5 text-right shrink-0 tabular-nums">
                      {i + 1}.
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-900 font-mono truncate">
                          {page.path}
                        </span>
                        <span className="text-sm font-semibold text-blue-600 tabular-nums shrink-0 ml-3">
                          {page.views}
                        </span>
                      </div>
                      <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${(page.views / maxViews) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Vercel + Deployment */}
        <div className="space-y-4">
          {external?.vercel && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Deployment — Vercel
              </h3>
              {external.vercel.lastDeployment ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          external.vercel.lastDeployment.state === 'READY'
                            ? 'bg-emerald-500'
                            : external.vercel.lastDeployment.state === 'ERROR'
                              ? 'bg-red-500'
                              : 'bg-amber-500'
                        }`}
                      />
                      <span className="text-sm font-medium text-gray-900">
                        {external.vercel.lastDeployment.state}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {timeAgo(external.vercel.lastDeployment.createdAt)}
                    </span>
                  </div>
                  {external.vercel.lastDeployment.commitMessage && (
                    <p className="text-xs text-gray-500 truncate">
                      {external.vercel.lastDeployment.commitMessage}
                    </p>
                  )}
                  {external.vercel.domains.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {external.vercel.domains.slice(0, 3).map((d) => (
                        <span
                          key={d}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-mono"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No deployment data</p>
              )}
            </div>
          )}

          {/* System Health */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
              System Health
            </h3>
            {runtime ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HealthDot ok={runtime.storage.healthy} />
                    <span className="text-sm text-gray-700">Database</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {runtime.storage.jobCount} jobs, {runtime.storage.clickCount} clicks
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HealthDot ok={runtime.ai.configured} />
                    <span className="text-sm text-gray-700">AI ({runtime.ai.provider})</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {runtime.ai.configured ? 'Configured' : 'Not configured'}
                  </span>
                </div>
                {external?.sentry && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HealthDot ok={external.sentry.errorsToday === 0} />
                      <span className="text-sm text-gray-700">Errors today</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {external.sentry.errorsToday} errors
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Unable to fetch runtime info</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick actions + Top jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Quick Actions
          </h3>
          <div className="space-y-2">
            <Link
              to="/admin/jobs?status=pending"
              className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <svg
                    className="h-4 w-4 text-amber-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Review pending jobs</p>
                  <p className="text-xs text-gray-500">
                    {analytics?.statusCounts.pending || 0} awaiting review
                  </p>
                </div>
              </div>
              <svg
                className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
            <Link
              to="/admin/intros?status=pending"
              className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-brand-50 flex items-center justify-center">
                  <svg
                    className="h-4 w-4 text-brand-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Manage warm intros</p>
                  <p className="text-xs text-gray-500">Pending intro requests</p>
                </div>
              </div>
              <svg
                className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
            <Link
              to="/admin/jobs/new"
              className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <svg
                    className="h-4 w-4 text-emerald-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Create new job</p>
                  <p className="text-xs text-gray-500">Add a role manually</p>
                </div>
              </div>
              <svg
                className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Top jobs */}
        {analytics && analytics.topJobs.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Top Jobs by Clicks
            </h3>
            <div className="space-y-2">
              {analytics.topJobs.map((job, i) => (
                <div key={job.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs text-gray-400 w-5 text-right shrink-0 tabular-nums">
                      {i + 1}.
                    </span>
                    <span className="text-gray-900 truncate">{job.title}</span>
                    <span className="text-gray-400 text-xs shrink-0">{job.company}</span>
                  </div>
                  <span className="text-brand-600 font-semibold tabular-nums shrink-0 ml-3">
                    {job.clicks}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Missing integrations hint */}
      {external &&
        !external.configured.posthog &&
        !external.configured.sentry &&
        !external.configured.vercel && (
          <div className="bg-gray-50 rounded-xl border border-gray-200 border-dashed p-6 text-center">
            <p className="text-sm font-medium text-gray-600 mb-1">
              Connect your analytics providers
            </p>
            <p className="text-xs text-gray-400 mb-3">
              Add environment variables to see live data from PostHog, Sentry, Vercel, and GA4.
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-xs font-mono text-gray-500">
              <code className="bg-white px-2 py-1 rounded border border-gray-200">
                POSTHOG_PERSONAL_API_KEY
              </code>
              <code className="bg-white px-2 py-1 rounded border border-gray-200">
                POSTHOG_PROJECT_ID
              </code>
              <code className="bg-white px-2 py-1 rounded border border-gray-200">
                VERCEL_TOKEN
              </code>
            </div>
            <p className="text-[10px] text-gray-400 mt-2">
              Sentry uses existing SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT vars.
            </p>
          </div>
        )}
    </div>
  );
}
