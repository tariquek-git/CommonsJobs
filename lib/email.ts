import { Resend } from 'resend';
import { getEnv } from './env.js';
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

export async function sendApprovalEmail(to: string, job: Job): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const jobUrl = `https://commonsjobs.com/job/${job.id}`;

  try {
    await resend.emails.send({
      from: 'Commons Jobs <notifications@commonsjobs.com>',
      to,
      subject: `Your job posting "${job.title}" is now live!`,
      html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #0A1628; margin-bottom: 8px;">Your job is live on Commons Jobs</h2>
          <p style="color: #64748B; font-size: 15px; line-height: 1.6;">
            Great news — <strong>${job.title}</strong> at <strong>${job.company}</strong> has been reviewed and approved by our community moderators.
          </p>
          <p style="color: #64748B; font-size: 15px; line-height: 1.6;">
            It's now visible to job seekers on the Commons Jobs board.
          </p>
          <a href="${jobUrl}" style="display: inline-block; background: #0D9488; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">
            View your posting
          </a>
          <p style="color: #94A3B8; font-size: 13px; margin-top: 24px;">
            — The Commons Jobs team
          </p>
        </div>
      `,
      text: `Your job posting "${job.title}" at ${job.company} is now live on Commons Jobs!\n\nView it here: ${jobUrl}\n\n— The Commons Jobs team`,
    });
    return true;
  } catch (err) {
    console.error('Email send error:', err);
    return false;
  }
}
