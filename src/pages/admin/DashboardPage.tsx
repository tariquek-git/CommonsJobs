import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { getAnalytics, getRuntime } from '../../lib/api';
import type { AnalyticsData } from '../../lib/api';
import type { RuntimeInfo } from '../../lib/types';

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
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

export default function DashboardPage() {
  const { token } = useAdminAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
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
      // fail silently — data will show as empty
    } finally {
      setLoading(false);
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
          {Array.from({ length: 4 }).map((_, i) => (
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
        <button
          onClick={fetchData}
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
            />
          </svg>
        </button>
      </div>

      {/* Stat cards */}
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

      {/* Quick actions + health */}
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
                  <span className="text-sm text-gray-700">Database (Supabase)</span>
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HealthDot ok />
                  <span className="text-sm text-gray-700">Uptime</span>
                </div>
                <span className="text-xs text-gray-500">{Math.floor(runtime.uptime / 60)}m</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Unable to fetch runtime info</p>
          )}
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
  );
}
