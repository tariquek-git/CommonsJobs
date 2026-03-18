import { Resend } from 'resend';
import { getEnv } from './env.js';
import { logger } from './logger.js';
import { getSupabase } from './supabase.js';

// ─── Resend Client ───

let resendClient: Resend | null = null;

function getResend(): Resend | null {
  const key = getEnv('RESEND_API_KEY');
  if (!key) return null;
  if (!resendClient) {
    resendClient = new Resend(key);
  }
  return resendClient;
}

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const DOMAIN = 'fintechcommons.com';
const SITE_URL = `https://www.${DOMAIN}/jobs`;
const FROM_TARIQUE = `Tarique @ Fintech Commons <tarique@${DOMAIN}>`;
const FROM_NOREPLY = `Fintech Commons <noreply@${DOMAIN}>`;

// ─── Branded HTML Wrapper ───

function brandedHtml(opts: {
  preheader?: string;
  heading: string;
  body: string;
  cta?: { label: string; url: string };
  footer?: string;
}): string {
  const preheader = opts.preheader
    ? `<div style="display:none;font-size:1px;color:#f8f8f8;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${esc(opts.preheader)}</div>`
    : '';

  const ctaBlock = opts.cta
    ? `<tr><td style="padding:24px 0 0;">
        <a href="${opts.cta.url}" style="display:inline-block;background:#635BFF;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">${esc(opts.cta.label)}</a>
       </td></tr>`
    : '';

  const footerText =
    opts.footer ||
    'You\'re getting this because you did something on Fintech Commons. Reply "unsubscribe" if you want off the list. No hard feelings. Mostly.';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>body{margin:0;padding:0;background:#F8FAFC;-webkit-font-smoothing:antialiased;}</style>
</head>
<body style="margin:0;padding:0;background:#F8FAFC;">
${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;">
<tr><td align="center" style="padding:32px 16px;">

<!-- Card -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #E2E8F0;overflow:hidden;">
  <!-- Brand bar -->
  <tr><td style="height:4px;background:linear-gradient(90deg,#635BFF,#FF3B8B,#FF6B00);font-size:0;">&nbsp;</td></tr>

  <!-- Logo row -->
  <tr><td style="padding:28px 32px 0;">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="width:28px;height:28px;background:#0A2540;border-radius:6px;text-align:center;vertical-align:middle;color:#ffffff;font-weight:700;font-size:14px;font-family:system-ui,-apple-system,sans-serif;">F</td>
      <td style="padding-left:10px;font-family:system-ui,-apple-system,sans-serif;font-size:15px;font-weight:600;color:#0A2540;">Fintech Commons</td>
    </tr></table>
  </td></tr>

  <!-- Heading -->
  <tr><td style="padding:20px 32px 0;font-family:system-ui,-apple-system,sans-serif;font-size:20px;font-weight:700;color:#0A2540;line-height:1.3;">${opts.heading}</td></tr>

  <!-- Body -->
  <tr><td style="padding:16px 32px 0;font-family:system-ui,-apple-system,sans-serif;font-size:15px;color:#475569;line-height:1.65;">${opts.body}</td></tr>

  ${ctaBlock}

  <!-- Sign off -->
  <tr><td style="padding:28px 32px 0;font-family:system-ui,-apple-system,sans-serif;">
    <p style="margin:0;font-size:14px;color:#475569;">Cheers,</p>
    <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#0A2540;">Tarique</p>
    <p style="margin:2px 0 0;font-size:12px;color:#94A3B8;">Fintech Commons</p>
  </td></tr>

  <!-- Divider -->
  <tr><td style="padding:24px 32px 0;"><hr style="border:none;border-top:1px solid #E2E8F0;margin:0;" /></td></tr>

  <!-- Footer -->
  <tr><td style="padding:16px 32px 28px;font-family:system-ui,-apple-system,sans-serif;font-size:12px;color:#94A3B8;line-height:1.5;">
    ${footerText}<br/>
    <a href="${SITE_URL}" style="color:#635BFF;text-decoration:none;">fintechcommons.com/jobs</a>
  </td></tr>
</table>
<!-- /Card -->

</td></tr>
</table>
</body>
</html>`;
}

// ─── Core send function ───

interface SendOpts {
  to: string;
  subject: string;
  heading: string;
  body: string;
  preheader?: string;
  cta?: { label: string; url: string };
  footer?: string;
  text: string; // plain text fallback
  from?: string;
  replyTo?: string;
  eventType: string;
  jobId?: string;
  introId?: string;
}

async function send(opts: SendOpts): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    logger.warn('Email skipped — no RESEND_API_KEY', { eventType: opts.eventType });
    return false;
  }

  try {
    const html = brandedHtml({
      preheader: opts.preheader,
      heading: opts.heading,
      body: opts.body,
      cta: opts.cta,
      footer: opts.footer,
    });

    const result = await resend.emails.send({
      from: opts.from || FROM_TARIQUE,
      to: opts.to,
      subject: opts.subject,
      html,
      text: opts.text,
      replyTo: opts.replyTo || getEnv('ADMIN_NOTIFICATION_EMAIL', `tarique@${DOMAIN}`),
    });

    logEmail(
      opts.eventType,
      opts.to,
      opts.subject,
      opts.jobId,
      opts.introId,
      'sent',
      {
        resend_id: result?.data?.id,
      },
      undefined,
      opts.text,
      opts.from || FROM_TARIQUE,
    );
    return true;
  } catch (err) {
    logger.error('Email send error', { eventType: opts.eventType, to: opts.to, error: err });
    logEmail(
      opts.eventType,
      opts.to,
      opts.subject,
      opts.jobId,
      opts.introId,
      'failed',
      undefined,
      err instanceof Error ? err.message : 'Unknown error',
      opts.text,
      opts.from || FROM_TARIQUE,
    );
    return false;
  }
}

// ─── Email log ───

function logEmail(
  eventType: string,
  recipient: string,
  subject: string,
  jobId?: string,
  introId?: string,
  status = 'sent',
  metadata?: Record<string, unknown>,
  errorMessage?: string,
  bodyText?: string,
  fromAddress?: string,
) {
  (async () => {
    try {
      const supabase = getSupabase();
      await supabase.from('email_logs').insert({
        event_type: eventType,
        recipient,
        subject,
        related_job_id: jobId || null,
        related_warm_intro_id: introId || null,
        status,
        metadata: {
          ...(metadata || {}),
          body_text: bodyText || null,
          from: fromAddress || null,
        },
        error_message: errorMessage || null,
      });
    } catch {
      // Non-critical
    }
  })();
}

// ════════════════════════════════════════════════════════════
// PUBLIC EMAIL FUNCTIONS
// ════════════════════════════════════════════════════════════

// ─── 1. Admin notification: new job submission ───

export async function notifyAdminNewSubmission(opts: {
  title: string;
  company: string;
  location?: string;
  submitterName?: string;
  submitterEmail?: string;
  referralSource?: string;
  warmIntroOk: boolean;
  ref: string;
  jobId?: string;
}): Promise<boolean> {
  const adminEmail = getEnv('ADMIN_NOTIFICATION_EMAIL');
  if (!adminEmail) return false;

  const lines: string[] = [
    `<p style="margin:0 0 6px;"><strong>Ref:</strong> ${esc(opts.ref)}</p>`,
    `<p style="margin:0 0 6px;"><strong>Title:</strong> ${esc(opts.title)}</p>`,
    `<p style="margin:0 0 6px;"><strong>Company:</strong> ${esc(opts.company)}</p>`,
  ];
  if (opts.location)
    lines.push(`<p style="margin:0 0 6px;"><strong>Location:</strong> ${esc(opts.location)}</p>`);
  if (opts.submitterName)
    lines.push(
      `<p style="margin:0 0 6px;"><strong>Submitted by:</strong> ${esc(opts.submitterName)} (${esc(opts.submitterEmail || 'no email')})</p>`,
    );
  if (opts.referralSource)
    lines.push(
      `<p style="margin:0 0 6px;"><strong>Heard about us:</strong> ${esc(opts.referralSource)}</p>`,
    );
  lines.push(
    opts.warmIntroOk
      ? '<p style="margin:0;color:#059669;">✅ Warm intros enabled</p>'
      : '<p style="margin:0;color:#9CA3AF;">❌ Warm intros disabled</p>',
  );

  return send({
    to: adminEmail,
    subject: `📥 New Submission: ${opts.title} at ${opts.company} [${opts.ref}]`,
    heading: 'New Job Submission',
    body: lines.join(''),
    preheader: `${opts.title} at ${opts.company} — needs review`,
    cta: { label: 'Review in Admin', url: `${SITE_URL}/admin` },
    text: `New job submission: ${opts.title} at ${opts.company}\nRef: ${opts.ref}\nSubmitter: ${opts.submitterName || 'N/A'} (${opts.submitterEmail || 'N/A'})\n\nReview at ${SITE_URL}/admin`,
    from: FROM_NOREPLY,
    eventType: 'submission_notification',
    jobId: opts.jobId,
  });
}

// ─── 2. Admin notification: warm intro request ───

export async function notifyAdminWarmIntro(opts: {
  jobId: string;
  jobTitle: string;
  jobCompany: string;
  requesterName: string;
  requesterEmail: string;
  linkedin?: string;
  message?: string;
  referrerName?: string;
  referrerCompany?: string;
  introId?: string;
}): Promise<boolean> {
  const adminEmail = getEnv('ADMIN_NOTIFICATION_EMAIL');
  if (!adminEmail) return false;

  const lines: string[] = [
    `<p style="margin:0 0 6px;"><strong>Role:</strong> ${esc(opts.jobTitle)} at ${esc(opts.jobCompany)}</p>`,
    `<p style="margin:0 0 6px;"><strong>From:</strong> ${esc(opts.requesterName)} &lt;${esc(opts.requesterEmail)}&gt;</p>`,
  ];
  if (opts.linkedin)
    lines.push(
      `<p style="margin:0 0 6px;"><strong>LinkedIn:</strong> <a href="${esc(opts.linkedin)}" style="color:#635BFF;">${esc(opts.linkedin)}</a></p>`,
    );
  if (opts.message)
    lines.push(`<p style="margin:0 0 6px;"><strong>Message:</strong> ${esc(opts.message)}</p>`);
  if (opts.referrerName || opts.referrerCompany) {
    const ref = `${opts.referrerName || 'Someone'}${opts.referrerCompany ? ` from ${opts.referrerCompany}` : ''}`;
    lines.push(`<p style="margin:0 0 6px;"><strong>📣 Referred by:</strong> ${esc(ref)}</p>`);
  }

  return send({
    to: adminEmail,
    subject: `🤝 Warm Intro Request: ${opts.jobTitle} at ${opts.jobCompany}`,
    heading: 'New Warm Intro Request',
    body: lines.join(''),
    preheader: `${opts.requesterName} wants an intro for ${opts.jobTitle}`,
    cta: { label: 'View Intros', url: `${SITE_URL}/admin/intros` },
    text: `Warm intro request for ${opts.jobTitle} at ${opts.jobCompany}\nFrom: ${opts.requesterName} (${opts.requesterEmail})\n${opts.linkedin ? `LinkedIn: ${opts.linkedin}\n` : ''}${opts.message ? `Message: ${opts.message}\n` : ''}\nView at ${SITE_URL}/admin/intros`,
    from: FROM_NOREPLY,
    eventType: 'warm_intro_admin_notification',
    jobId: opts.jobId,
    introId: opts.introId,
  });
}

// ─── 3. Thank-you to warm intro requester ───

export async function sendWarmIntroThankYou(opts: {
  requesterName: string;
  requesterEmail: string;
  jobTitle: string;
  jobCompany: string;
  jobId: string;
  introId?: string;
}): Promise<boolean> {
  const firstName = opts.requesterName.split(' ')[0];

  return send({
    to: opts.requesterEmail,
    subject: `Got your intro request 👋 ${opts.jobTitle} at ${opts.jobCompany}`,
    heading: `Got it, ${esc(firstName)}. 👍`,
    body: `
      <p style="margin:0 0 12px;">Your warm intro request for <strong>${esc(opts.jobTitle)}</strong> at <strong>${esc(opts.jobCompany)}</strong> is in.</p>
      <p style="margin:0 0 12px;">I'll put your name in front of the right person. Most intros happen within a few business days.</p>
      <p style="margin:0 0 12px;">No guarantees. Hiring is messy and timelines shift. But it beats a cold apply.</p>
      <p style="margin:0;">Questions? Reply here. It comes straight to me.</p>
    `,
    preheader: `I'll put your name in front of the right person.`,
    cta: { label: 'Browse More Roles', url: SITE_URL },
    text: `Hi ${firstName},\n\nYour warm intro request for ${opts.jobTitle} at ${opts.jobCompany} is in.\n\nI'll put your name in front of the right person. Most intros happen within a few business days.\n\nNo guarantees. Hiring is messy and timelines shift. But it beats a cold apply.\n\nQuestions? Reply here.\n\nCheers,\nTarique\nFintech Commons`,
    eventType: 'warm_intro_thank_you',
    jobId: opts.jobId,
    introId: opts.introId,
  });
}

// ─── 4. Intro connection: email to requester (you're being introduced) ───

export async function sendIntroToRequester(opts: {
  requesterName: string;
  requesterEmail: string;
  contactName: string;
  contactEmail: string;
  contactRole?: string;
  jobTitle: string;
  jobCompany: string;
  jobId: string;
  introId?: string;
}): Promise<boolean> {
  const firstName = opts.requesterName.split(' ')[0];
  const contactFirst = opts.contactName.split(' ')[0];

  return send({
    to: opts.requesterEmail,
    subject: `Intro: ${opts.requesterName} ↔ ${opts.contactName} (${opts.jobCompany})`,
    heading: `${esc(firstName)}, meet ${esc(contactFirst)}. 🤝`,
    body: `
      <p style="margin:0 0 12px;">I've connected you with <strong>${esc(opts.contactName)}</strong>${opts.contactRole ? ` (${esc(opts.contactRole)})` : ''} at <strong>${esc(opts.jobCompany)}</strong> for the <strong>${esc(opts.jobTitle)}</strong> role.</p>
      <p style="margin:0 0 12px;">${esc(contactFirst)} is CC'd. Take it from here. Introduce yourself, share why you're interested, and suggest a time to chat.</p>
      <p style="margin:0 0 16px;padding:12px 16px;background:#F0F0FF;border-left:3px solid #635BFF;border-radius:0 6px 6px 0;font-size:14px;color:#475569;">
        Keep it short. One or two reasons you're a fit. A time that works for a call. That's it.
      </p>
      <p style="margin:0;">Skip the cover letter energy. Just be genuine. Good luck 🚀</p>
    `,
    preheader: `You've been introduced to ${opts.contactName} at ${opts.jobCompany}`,
    text: `Hi ${firstName},\n\nI've connected you with ${opts.contactName}${opts.contactRole ? ` (${opts.contactRole})` : ''} at ${opts.jobCompany} for the ${opts.jobTitle} role.\n\n${contactFirst} is CC'd. Take it from here. Introduce yourself, share why you're interested, and suggest a time to chat.\n\nKeep it short. Skip the cover letter energy. Just be genuine. Good luck 🚀\n\nCheers,\nTarique\nFintech Commons`,
    eventType: 'warm_intro_connection_requester',
    jobId: opts.jobId,
    introId: opts.introId,
  });
}

// ─── 5. Intro connection: email to the contact/hiring side ───

export async function sendIntroToContact(opts: {
  contactName: string;
  contactEmail: string;
  requesterName: string;
  requesterEmail: string;
  requesterLinkedin?: string;
  requesterMessage?: string;
  jobTitle: string;
  jobCompany: string;
  jobId: string;
  introId?: string;
}): Promise<boolean> {
  const contactFirst = opts.contactName.split(' ')[0];

  const extraLines: string[] = [];
  if (opts.requesterLinkedin) {
    extraLines.push(
      `<p style="margin:0 0 6px;"><strong>LinkedIn:</strong> <a href="${esc(opts.requesterLinkedin)}" style="color:#635BFF;">${esc(opts.requesterLinkedin)}</a></p>`,
    );
  }
  if (opts.requesterMessage) {
    extraLines.push(
      `<p style="margin:0 0 6px;"><strong>Their note:</strong> "${esc(opts.requesterMessage)}"</p>`,
    );
  }

  return send({
    to: opts.contactEmail,
    subject: `Intro: ${opts.requesterName} ↔ ${opts.contactName} (${opts.jobTitle})`,
    heading: `${esc(contactFirst)}, meet ${esc(opts.requesterName.split(' ')[0])}. 👋`,
    body: `
      <p style="margin:0 0 12px;">Connecting you with <strong>${esc(opts.requesterName)}</strong>. They're interested in the <strong>${esc(opts.jobTitle)}</strong> role at <strong>${esc(opts.jobCompany)}</strong>.</p>
      <p style="margin:0 0 12px;">They came through Fintech Commons, where I review every intro request personally. This is a warm lead, not a cold apply.</p>
      ${extraLines.length > 0 ? `<div style="margin:0 0 12px;padding:12px 16px;background:#F8FAFC;border-radius:8px;border:1px solid #E2E8F0;">${extraLines.join('')}</div>` : ''}
      <p style="margin:0;">${esc(opts.requesterName.split(' ')[0])} is CC'd. You two can take it from here.</p>
    `,
    preheader: `Warm intro for ${opts.jobTitle} — ${opts.requesterName} via Fintech Commons`,
    text: `Hi ${contactFirst},\n\nConnecting you with ${opts.requesterName}. They're interested in the ${opts.jobTitle} role at ${opts.jobCompany}.\n\nThey came through Fintech Commons, where I review every intro request personally. This is a warm lead, not a cold apply.\n\n${opts.requesterLinkedin ? `LinkedIn: ${opts.requesterLinkedin}\n` : ''}${opts.requesterMessage ? `Their note: "${opts.requesterMessage}"\n` : ''}${opts.requesterName.split(' ')[0]} is CC'd. You two can take it from here.\n\nCheers,\nTarique\nFintech Commons`,
    eventType: 'warm_intro_connection_contact',
    jobId: opts.jobId,
    introId: opts.introId,
  });
}

// ─── 6. Job approved: notify submitter ───

export async function sendJobApproved(opts: {
  submitterName: string;
  submitterEmail: string;
  jobTitle: string;
  jobCompany: string;
  jobId: string;
}): Promise<boolean> {
  const firstName = opts.submitterName.split(' ')[0];
  const jobUrl = `${SITE_URL}/jobs/${opts.jobId}`;

  return send({
    to: opts.submitterEmail,
    subject: `Your role is live 🎉 ${opts.jobTitle} at ${opts.jobCompany}`,
    heading: `${esc(firstName)}, you're live. 🎉`,
    body: `
      <p style="margin:0 0 12px;">I reviewed <strong>${esc(opts.jobTitle)}</strong> at <strong>${esc(opts.jobCompany)}</strong>. It's live on Fintech Commons now.</p>
      <p style="margin:0 0 12px;">Candidates can view it, apply, and request warm intros straight to you through the platform.</p>
      <p style="margin:0;">Thanks for posting. Happy hiring. 🙌</p>
    `,
    preheader: `${opts.jobTitle} at ${opts.jobCompany} is now live on Fintech Commons`,
    cta: { label: 'View Your Posting', url: jobUrl },
    text: `Hi ${firstName},\n\nI reviewed ${opts.jobTitle} at ${opts.jobCompany}. It's live on Fintech Commons now.\n\nView it: ${jobUrl}\n\nCandidates can view it, apply, and request warm intros straight to you.\n\nThanks for posting. Happy hiring.\n\nCheers,\nTarique\nFintech Commons`,
    eventType: 'job_approved_notification',
    jobId: opts.jobId,
  });
}

// ─── 7. Warm intro — no response follow-up ───

export async function sendIntroNoResponse(opts: {
  requesterName: string;
  requesterEmail: string;
  jobTitle: string;
  jobCompany: string;
  jobId: string;
  introId?: string;
}): Promise<boolean> {
  const firstName = opts.requesterName.split(' ')[0];

  return send({
    to: opts.requesterEmail,
    subject: `Update on your intro request — ${opts.jobTitle} at ${opts.jobCompany}`,
    heading: `Honest update, ${esc(firstName)}.`,
    body: `
      <p style="margin:0 0 12px;">Following up on your intro request for <strong>${esc(opts.jobTitle)}</strong> at <strong>${esc(opts.jobCompany)}</strong>.</p>
      <p style="margin:0 0 12px;">I reached out but didn't hear back from the hiring side. Not a reflection on you. Sometimes timing doesn't line up.</p>
      <p style="margin:0 0 12px;">There are other roles on the board worth a look. Request intros for anything that catches your eye. I'm here. 💪</p>
    `,
    preheader: `Update on your intro for ${opts.jobTitle} at ${opts.jobCompany}`,
    cta: { label: 'Browse Roles', url: SITE_URL },
    text: `Hi ${firstName},\n\nFollowing up on your intro request for ${opts.jobTitle} at ${opts.jobCompany}.\n\nI reached out but didn't hear back from the hiring side. Not a reflection on you. Sometimes timing doesn't line up.\n\nThere are other roles on the board worth a look. Request intros for anything that catches your eye. I'm here. 💪\n\n${SITE_URL}\n\nCheers,\nTarique\nFintech Commons`,
    eventType: 'warm_intro_no_response',
    jobId: opts.jobId,
    introId: opts.introId,
  });
}

// ─── 8. Job submission confirmation to submitter ───

export async function sendSubmissionConfirmation(opts: {
  submitterName: string;
  submitterEmail: string;
  jobTitle: string;
  jobCompany: string;
  ref: string;
  jobId?: string;
}): Promise<boolean> {
  const firstName = opts.submitterName.split(' ')[0];

  return send({
    to: opts.submitterEmail,
    subject: `Got your submission 👍 ${opts.jobTitle} at ${opts.jobCompany}`,
    heading: `Got it, ${esc(firstName)}. 👍`,
    body: `
      <p style="margin:0 0 12px;">Your submission for <strong>${esc(opts.jobTitle)}</strong> at <strong>${esc(opts.jobCompany)}</strong> is in.</p>
      <p style="margin:0 0 12px;padding:12px 16px;background:#F8FAFC;border-radius:8px;border:1px solid #E2E8F0;font-size:14px;">
        <strong>Reference:</strong> ${esc(opts.ref)}<br/>
        <strong>Status:</strong> Pending review
      </p>
      <p style="margin:0 0 12px;">I review every role personally. Keeps the board honest. You'll hear from me once it's live. Usually 24-48 hours.</p>
      <p style="margin:0;">Questions? Reply here. It comes straight to me.</p>
    `,
    preheader: `Your submission for ${opts.jobTitle} at ${opts.jobCompany} is under review`,
    cta: { label: 'Browse the Board', url: SITE_URL },
    text: `Hi ${firstName},\n\nYour submission for ${opts.jobTitle} at ${opts.jobCompany} is in.\n\nReference: ${opts.ref}\nStatus: Pending review\n\nI review every role personally. Keeps the board honest. You'll hear from me once it's live. Usually 24-48 hours.\n\nQuestions? Reply here. It comes straight to me.\n\nCheers,\nTarique\nFintech Commons`,
    eventType: 'submission_confirmation',
    jobId: opts.jobId,
  });
}

// ─── 9. Admin: warm intro status changed to "contacted" ───

export async function sendIntroContacted(opts: {
  requesterName: string;
  requesterEmail: string;
  jobTitle: string;
  jobCompany: string;
  jobId: string;
  introId?: string;
}): Promise<boolean> {
  const firstName = opts.requesterName.split(' ')[0];

  return send({
    to: opts.requesterEmail,
    subject: `On it — ${opts.jobTitle} at ${opts.jobCompany}`,
    heading: `Quick update, ${esc(firstName)}. ⏳`,
    body: `
      <p style="margin:0 0 12px;">I reached out to the team at <strong>${esc(opts.jobCompany)}</strong> about the <strong>${esc(opts.jobTitle)}</strong> role on your behalf.</p>
      <p style="margin:0 0 12px;">Sit tight. These things usually move within a few business days. I'll let you know as soon as I hear back.</p>
      <p style="margin:0;">Questions? Reply here.</p>
    `,
    preheader: `I've reached out to ${opts.jobCompany} on your behalf`,
    text: `Hi ${firstName},\n\nI reached out to the team at ${opts.jobCompany} about the ${opts.jobTitle} role on your behalf.\n\nSit tight. These things usually move within a few business days. I'll let you know as soon as I hear back.\n\nQuestions? Reply here.\n\nCheers,\nTarique\nFintech Commons`,
    eventType: 'warm_intro_contacted',
    jobId: opts.jobId,
    introId: opts.introId,
  });
}

// ─── 10. Post-intro follow-up: "How did it go?" ───

export async function sendIntroFollowUp(opts: {
  requesterName: string;
  requesterEmail: string;
  contactName: string;
  jobTitle: string;
  jobCompany: string;
  jobId: string;
  introId?: string;
}): Promise<boolean> {
  const firstName = opts.requesterName.split(' ')[0];
  const contactFirst = opts.contactName.split(' ')[0];

  return send({
    to: opts.requesterEmail,
    subject: `How did it go with ${opts.jobCompany}?`,
    heading: `Checking in, ${esc(firstName)}.`,
    body: `
      <p style="margin:0 0 12px;">Did you get a chance to connect with ${esc(contactFirst)} at <strong>${esc(opts.jobCompany)}</strong> about the <strong>${esc(opts.jobTitle)}</strong> role?</p>
      <p style="margin:0 0 12px;">Good news, bad news, still waiting. Whatever it is, I want to hear it. Helps me make better intros for everyone.</p>
      <p style="margin:0 0 16px;padding:12px 16px;background:#F0F0FF;border-left:3px solid #635BFF;border-radius:0 6px 6px 0;font-size:14px;color:#475569;">
        Reply here. Even a one-liner works.
      </p>
      <p style="margin:0;">Either way, I'm in your corner. 🤞</p>
    `,
    preheader: `How did your intro with ${opts.jobCompany} go?`,
    text: `Hi ${firstName},\n\nDid you get a chance to connect with ${contactFirst} at ${opts.jobCompany} about the ${opts.jobTitle} role?\n\nGood news, bad news, still waiting. Whatever it is, I want to hear it. Helps me make better intros for everyone.\n\nReply here. Even a one-liner works.\n\nEither way, I'm in your corner. 🤞\n\nCheers,\nTarique\nFintech Commons`,
    eventType: 'warm_intro_follow_up',
    jobId: opts.jobId,
    introId: opts.introId,
  });
}
