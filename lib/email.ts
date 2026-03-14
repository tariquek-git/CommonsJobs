import { Resend } from 'resend';
import { getEnv } from './env.js';
import { logger } from './logger.js';
import type { Job } from '../shared/types.js';

let resendClient: Resend | null = null;

function getResend(): Resend | null {
  const key = getEnv('RESEND_API_KEY');
  if (!key) return null;
  if (!resendClient) {
    resendClient = new Resend(key);
  }
  return resendClient;
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function sendApprovalEmail(to: string, job: Job): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const jobUrl = `https://commonsjobs.com/job/${job.id}`;
  const safeTitle = escHtml(job.title);
  const safeCompany = escHtml(job.company);

  try {
    await resend.emails.send({
      from: 'Fintech Commons <notifications@commonsjobs.com>',
      to,
      subject: `Your job posting "${job.title}" is now live!`,
      html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #0A1628; margin-bottom: 8px;">Your job is live on Fintech Commons</h2>
          <p style="color: #64748B; font-size: 15px; line-height: 1.6;">
            Great news — <strong>${safeTitle}</strong> at <strong>${safeCompany}</strong> has been reviewed and approved by our community moderators.
          </p>
          <p style="color: #64748B; font-size: 15px; line-height: 1.6;">
            It's now visible to job seekers on the Fintech Commons board.
          </p>
          <a href="${jobUrl}" style="display: inline-block; background: #0D9488; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">
            View your posting
          </a>
          <p style="color: #94A3B8; font-size: 13px; margin-top: 24px;">
            — The Fintech Commons team
          </p>
        </div>
      `,
      text: `Your job posting "${job.title}" at ${job.company} is now live on Fintech Commons!\n\nView it here: ${jobUrl}\n\n— The Fintech Commons team`,
    });
    return true;
  } catch (err) {
    logger.error('Email send error', { endpoint: 'email', to, error: err });
    return false;
  }
}
