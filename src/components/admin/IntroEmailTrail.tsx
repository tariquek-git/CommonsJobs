import { getRelativeTimeLabel } from '../../lib/date';
import type { EmailLog } from '../../lib/api';
import { EVENT_SHORT } from './introConstants';

// ─── Email Row ───

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

// ─── Email Trail ───

export function EmailTrail({ logs, loading }: { logs?: EmailLog[]; loading: boolean }) {
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
