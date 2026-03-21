// Shared constants and types for the Intros admin feature

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  contacted: 'Contacted',
  accepted: 'Accepted',
  connected: 'Introduced',
  followed_up: 'Followed Up',
  declined: 'Declined',
  no_response: 'No Response',
};

export const STATUS_ORDER = [
  'pending',
  'contacted',
  'accepted',
  'connected',
  'followed_up',
  'declined',
  'no_response',
];

export interface PipelineCfg {
  label: string;
  subtitle: string;
  color: string;
  activeBg: string;
  activeBorder: string;
  textColor: string;
  countColor: string;
}

export const PIPELINE_CONFIG: Record<string, PipelineCfg> = {
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

export const CARD_BORDER: Record<string, string> = {
  pending: 'border-l-amber-400',
  contacted: 'border-l-blue-400',
  accepted: 'border-l-teal-400',
  connected: 'border-l-emerald-400',
  followed_up: 'border-l-purple-400',
  declined: 'border-l-red-300',
  no_response: 'border-l-gray-300',
};

export const BADGE_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  contacted: 'bg-blue-50 text-blue-700',
  accepted: 'bg-teal-50 text-teal-700',
  connected: 'bg-emerald-50 text-emerald-700',
  followed_up: 'bg-purple-50 text-purple-700',
  declined: 'bg-red-50 text-red-600',
  no_response: 'bg-gray-100 text-gray-500',
};

// ─── Confirmation modal types ───

export interface ConfirmModalState {
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

export function getEmailPreview(newStatus: string, intro: ConfirmModalState): string[] {
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
