import { getRelativeTimeLabel } from '../../lib/date';
import type { EmailLog } from '../../lib/api';

// ─── Email event type short labels ───

export const EVENT_SHORT: Record<string, string> = {
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
