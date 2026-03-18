import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../../../lib/auth.js';
import {
  sendWarmIntroThankYou,
  sendIntroToRequester,
  sendIntroToContact,
  sendJobApproved,
  sendIntroNoResponse,
  sendSubmissionConfirmation,
  sendIntroContacted,
  sendIntroFollowUp,
} from '../../../lib/email.js';

/**
 * POST /api/admin/email/test?to=email@example.com
 *
 * Sends all 8 user-facing email templates to the specified address
 * with sample data. Admin-only.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!requireAdmin(req as unknown as Request)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const to = (req.query.to as string) || '';
  if (!to || !to.includes('@')) {
    return res.status(400).json({ error: 'Missing or invalid ?to= email param' });
  }

  const fakeJobId = '00000000-0000-0000-0000-000000000000';
  const fakeIntroId = '00000000-0000-0000-0000-000000000001';

  const results: { template: string; sent: boolean }[] = [];

  // 1. Submission Confirmation
  results.push({
    template: 'submission_confirmation',
    sent: await sendSubmissionConfirmation({
      submitterName: 'Tarique Khan',
      submitterEmail: to,
      jobTitle: 'Senior Backend Engineer',
      jobCompany: 'Stripe',
      ref: 'CJ-TEST1234',
      jobId: fakeJobId,
    }),
  });

  // 2. Job Approved
  results.push({
    template: 'job_approved',
    sent: await sendJobApproved({
      submitterName: 'Tarique Khan',
      submitterEmail: to,
      jobTitle: 'Senior Backend Engineer',
      jobCompany: 'Stripe',
      jobId: fakeJobId,
    }),
  });

  // 3. Warm Intro Thank You
  results.push({
    template: 'warm_intro_thank_you',
    sent: await sendWarmIntroThankYou({
      requesterName: 'Tarique Khan',
      requesterEmail: to,
      jobTitle: 'Product Manager',
      jobCompany: 'Plaid',
      jobId: fakeJobId,
      introId: fakeIntroId,
    }),
  });

  // 4. Intro Contacted
  results.push({
    template: 'intro_contacted',
    sent: await sendIntroContacted({
      requesterName: 'Tarique Khan',
      requesterEmail: to,
      jobTitle: 'Product Manager',
      jobCompany: 'Plaid',
      jobId: fakeJobId,
      introId: fakeIntroId,
    }),
  });

  // 5. Intro to Requester
  results.push({
    template: 'intro_to_requester',
    sent: await sendIntroToRequester({
      requesterName: 'Tarique Khan',
      requesterEmail: to,
      contactName: 'Sarah Chen',
      contactEmail: 'sarah@plaid.com',
      contactRole: 'VP of Product',
      jobTitle: 'Product Manager',
      jobCompany: 'Plaid',
      jobId: fakeJobId,
      introId: fakeIntroId,
    }),
  });

  // 6. Intro to Contact (hiring side)
  results.push({
    template: 'intro_to_contact',
    sent: await sendIntroToContact({
      contactName: 'Tarique Khan',
      contactEmail: to,
      requesterName: 'Alex Rivera',
      requesterEmail: 'alex@gmail.com',
      requesterLinkedin: 'https://linkedin.com/in/alexrivera',
      requesterMessage:
        'I have 5 years in payments infrastructure and would love to chat about this role.',
      jobTitle: 'Product Manager',
      jobCompany: 'Plaid',
      jobId: fakeJobId,
      introId: fakeIntroId,
    }),
  });

  // 7. Intro No Response
  results.push({
    template: 'intro_no_response',
    sent: await sendIntroNoResponse({
      requesterName: 'Tarique Khan',
      requesterEmail: to,
      jobTitle: 'Product Manager',
      jobCompany: 'Plaid',
      jobId: fakeJobId,
      introId: fakeIntroId,
    }),
  });

  // 8. Intro Follow Up
  results.push({
    template: 'intro_follow_up',
    sent: await sendIntroFollowUp({
      requesterName: 'Tarique Khan',
      requesterEmail: to,
      contactName: 'Sarah Chen',
      jobTitle: 'Product Manager',
      jobCompany: 'Plaid',
      jobId: fakeJobId,
      introId: fakeIntroId,
    }),
  });

  const succeeded = results.filter((r) => r.sent).length;
  const failed = results.filter((r) => !r.sent).length;

  return res.status(200).json({
    message: `Sent ${succeeded}/8 test emails to ${to}`,
    succeeded,
    failed,
    results,
  });
}
