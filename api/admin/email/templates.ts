import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../../../lib/auth';

/**
 * GET /api/admin/email/templates
 *
 * Returns the list of email templates.
 * Currently hardcoded — will be moved to database when template
 * customization is fully implemented.
 *
 * This endpoint exists so the admin UI can fetch templates from
 * a single source of truth when the backend needs to send them.
 */

const TEMPLATES = [
  {
    id: 'job_approved',
    name: 'Job Approved',
    trigger: 'job_status_change:active',
    subject: 'Your role on Fintech Commons is live — {{job_title}} at {{company}}',
    variables: ['submitter_name', 'job_title', 'company', 'job_url'],
  },
  {
    id: 'job_rejected',
    name: 'Job Not Listed',
    trigger: 'job_status_change:rejected',
    subject: 'Update on your Fintech Commons submission — {{job_title}}',
    variables: ['submitter_name', 'job_title', 'company'],
  },
  {
    id: 'warm_intro_request',
    name: 'Warm Intro Request',
    trigger: 'warm_intro_created',
    subject: 'Someone wants a warm intro to {{job_title}} at {{company}}',
    variables: [
      'submitter_name',
      'requester_name',
      'requester_email',
      'requester_linkedin',
      'requester_message',
      'job_title',
      'company',
    ],
  },
  {
    id: 'warm_intro_connected',
    name: 'Intro Made',
    trigger: 'warm_intro_status_change:connected',
    subject: 'Your intro to {{company}} for {{job_title}}',
    variables: ['requester_name', 'submitter_name', 'submitter_email', 'job_title', 'company'],
  },
  {
    id: 'warm_intro_no_response',
    name: 'No Response Follow-up',
    trigger: 'warm_intro_status_change:no_response',
    subject: 'Following up on your warm intro request — {{job_title}}',
    variables: ['requester_name', 'job_title', 'company', 'job_url'],
  },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!requireAdmin(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return res.status(200).json({ templates: TEMPLATES });
}
