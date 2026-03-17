import { useState, useEffect } from 'react';
import { useAdminAuth } from '../../hooks/useAdminAuth';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  description: string;
  variables: string[];
}

const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: 'job_approved',
    name: 'Job Approved',
    subject: 'Your role on Fintech Commons is live — {{job_title}} at {{company}}',
    body: `Hi {{submitter_name}},

Your listing for **{{job_title}}** at **{{company}}** is now live on Fintech Commons.

**Direct link:** {{job_url}}

Candidates can apply directly or request a warm intro through your listing. If someone requests a warm intro, we'll email you with their details so you can decide whether to connect.

A few tips:
- Listings expire automatically after 60 days. You can resubmit anytime.
- If the role is filled, reply to this email and we'll take it down.
- Share the direct link above — it's public and ready to go.

Thanks for posting,
Tarique
Fintech Commons`,
    description: 'Sent when you approve a pending job submission',
    variables: ['submitter_name', 'job_title', 'company', 'job_url'],
  },
  {
    id: 'job_rejected',
    name: 'Job Not Listed',
    subject: 'Update on your Fintech Commons submission — {{job_title}}',
    body: `Hi {{submitter_name}},

Thanks for submitting **{{job_title}}** at **{{company}}** to Fintech Commons.

After review, we've decided not to list this role. Common reasons include:
- The listing was too vague or appeared to be a duplicate
- We couldn't verify the role or company
- The position didn't meet our fintech/banking focus

No hard feelings — feel free to resubmit with more detail or reach out if you think we got it wrong.

Best,
Tarique`,
    description: 'Sent when you reject a submission',
    variables: ['submitter_name', 'job_title', 'company'],
  },
  {
    id: 'warm_intro_request',
    name: 'Warm Intro Request',
    subject: 'Someone wants a warm intro to {{job_title}} at {{company}}',
    body: `Hi {{submitter_name}},

**{{requester_name}}** is requesting a warm intro for your listing:

**Role:** {{job_title}} at {{company}}
**Their email:** {{requester_email}}
{{#requester_linkedin}}**LinkedIn:** {{requester_linkedin}}{{/requester_linkedin}}

{{#requester_message}}
Their message:
> {{requester_message}}
{{/requester_message}}

**What to do:**
- If you'd like to connect them, reply to this email or reach out to them directly
- If you'd rather pass, no action needed — we'll follow up

The ball is in your court. No pressure.

Tarique
Fintech Commons`,
    description: 'Sent to the job poster when someone requests a warm intro',
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
    subject: 'Your intro to {{company}} for {{job_title}}',
    body: `Hi {{requester_name}},

Good news — I've connected you with the team at **{{company}}** for the **{{job_title}}** role.

**Contact:** {{submitter_name}} ({{submitter_email}})

I'd suggest:
1. Send a brief intro email to them within 24 hours
2. Reference that you found the role on Fintech Commons
3. Attach your resume or LinkedIn profile

If things don't work out for this role, keep an eye on the board — new listings go up regularly.

Good luck,
Tarique
Fintech Commons`,
    description: 'Sent to the requester when you make the intro',
    variables: ['requester_name', 'submitter_name', 'submitter_email', 'job_title', 'company'],
  },
  {
    id: 'warm_intro_no_response',
    name: 'No Response Follow-up',
    subject: 'Following up on your warm intro request — {{job_title}}',
    body: `Hi {{requester_name}},

I wanted to follow up on your warm intro request for **{{job_title}}** at **{{company}}**.

Unfortunately, the poster hasn't responded. This happens sometimes — roles get filled quickly or priorities shift.

A couple of options:
- **Apply directly** through the listing: {{job_url}}
- **Browse other roles** on the board — new ones are added regularly

Sorry I couldn't make this one happen. Keep at it.

Tarique`,
    description: "Sent to the requester when the poster doesn't respond",
    variables: ['requester_name', 'job_title', 'company', 'job_url'],
  },
];

function TemplateCard({
  template,
  onEdit,
  onPreview,
}: {
  template: EmailTemplate;
  onEdit: () => void;
  onPreview: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{template.name}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{template.description}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onPreview}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Preview
            </button>
            <button
              onClick={onEdit}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors"
            >
              Edit
            </button>
          </div>
        </div>

        <div className="mt-3 rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500 mb-1">Subject:</p>
          <p className="text-sm text-gray-800 font-mono">{template.subject}</p>
        </div>

        <div className="mt-2 flex flex-wrap gap-1">
          {template.variables.map((v) => (
            <span
              key={v}
              className="inline-flex items-center rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-mono text-brand-600"
            >
              {`{{${v}}}`}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function TemplateEditor({
  template,
  onSave,
  onCancel,
}: {
  template: EmailTemplate;
  onSave: (t: EmailTemplate) => void;
  onCancel: () => void;
}) {
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Editing: {template.name}</h3>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onCancel}
            className="text-xs px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave({ ...template, subject, body })}
            className="text-xs px-3 py-1.5 rounded-lg bg-brand-500 text-white hover:bg-brand-600"
          >
            Save Template
          </button>
        </div>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Subject Line</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Body (Markdown supported)
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={16}
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 leading-relaxed"
          />
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Available variables:</p>
          <div className="flex flex-wrap gap-1">
            {template.variables.map((v) => (
              <button
                key={v}
                onClick={() => {
                  // Insert variable at cursor position would be ideal,
                  // but for now just show it
                }}
                className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-mono text-gray-600 hover:bg-gray-200 cursor-default"
              >
                {`{{${v}}}`}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TemplatePreview({ template, onClose }: { template: EmailTemplate; onClose: () => void }) {
  // Replace variables with sample data
  const sampleData: Record<string, string> = {
    submitter_name: 'Sarah Chen',
    submitter_email: 'sarah@example.com',
    requester_name: 'Alex Rivera',
    requester_email: 'alex@example.com',
    requester_linkedin: 'https://linkedin.com/in/alexrivera',
    requester_message:
      "I've been in payments for 5 years and this role looks like a great fit. Would love an introduction.",
    job_title: 'Senior Backend Engineer',
    company: 'Brim Financial',
    job_url: 'https://fintechcommons.com/job/abc-123',
  };

  const fillTemplate = (text: string) => {
    let filled = text;
    for (const [key, val] of Object.entries(sampleData)) {
      filled = filled.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
    }
    // Handle conditional blocks
    filled = filled.replace(/\{\{#(\w+)\}\}(.*?)\{\{\/\1\}\}/gs, (_, key, content) => {
      return sampleData[key]
        ? content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), sampleData[key])
        : '';
    });
    return filled;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Preview: {template.name}</h3>
        <button
          onClick={onClose}
          className="text-xs px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
        >
          Close
        </button>
      </div>
      <div className="p-5 space-y-4">
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Subject</p>
          <p className="text-sm font-medium text-gray-900">{fillTemplate(template.subject)}</p>
        </div>
        <div className="rounded-lg border border-gray-100 p-4">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
            {fillTemplate(template.body)}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default function EmailPage() {
  const { token: _token } = useAdminAuth();
  const [templates, setTemplates] = useState<EmailTemplate[]>(DEFAULT_TEMPLATES);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Email Templates | Admin';
  }, []);

  const handleSave = (updated: EmailTemplate) => {
    setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setEditingId(null);
  };

  const editingTemplate = templates.find((t) => t.id === editingId);
  const previewTemplate = templates.find((t) => t.id === previewId);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage automated email templates for job approvals, warm intros, and follow-ups
        </p>
      </div>

      {/* Status banner */}
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
        <svg
          className="h-5 w-5 text-amber-600 shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
        <div>
          <p className="text-sm font-medium text-amber-800">
            Email sending requires Resend API key
          </p>
          <p className="text-xs text-amber-700 mt-0.5">
            Add <code className="bg-amber-100 px-1 py-0.5 rounded">RESEND_API_KEY</code> to your
            environment variables to enable automated email delivery. Templates can be edited and
            previewed now — emails will send automatically once the key is configured.
          </p>
        </div>
      </div>

      {/* Editor or Preview */}
      {editingTemplate && (
        <TemplateEditor
          template={editingTemplate}
          onSave={handleSave}
          onCancel={() => setEditingId(null)}
        />
      )}

      {previewTemplate && !editingId && (
        <TemplatePreview template={previewTemplate} onClose={() => setPreviewId(null)} />
      )}

      {/* Template list */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {templates.length} Templates
        </h2>
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onEdit={() => {
              setPreviewId(null);
              setEditingId(template.id);
            }}
            onPreview={() => {
              setEditingId(null);
              setPreviewId(template.id);
            }}
          />
        ))}
      </div>

      {/* How it works */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-sm font-semibold text-gray-700">How Email Automation Works</h3>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-start gap-3">
            <span className="h-6 w-6 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold flex items-center justify-center shrink-0">
              1
            </span>
            <div>
              <p className="text-sm font-medium text-gray-900">Job Approved</p>
              <p className="text-xs text-gray-500">
                When you approve a job, the submitter automatically gets the "Job Approved" email
                with their listing link.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="h-6 w-6 rounded-full bg-blue-50 text-blue-600 text-xs font-bold flex items-center justify-center shrink-0">
              2
            </span>
            <div>
              <p className="text-sm font-medium text-gray-900">Warm Intro Requested</p>
              <p className="text-xs text-gray-500">
                When a candidate requests a warm intro, the job poster gets an email with the
                requester's details and message.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="h-6 w-6 rounded-full bg-brand-50 text-brand-600 text-xs font-bold flex items-center justify-center shrink-0">
              3
            </span>
            <div>
              <p className="text-sm font-medium text-gray-900">Intro Made</p>
              <p className="text-xs text-gray-500">
                When you mark an intro as "Connected," the requester gets the contact details and
                next steps.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="h-6 w-6 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center shrink-0">
              4
            </span>
            <div>
              <p className="text-sm font-medium text-gray-900">No Response</p>
              <p className="text-xs text-gray-500">
                If you mark an intro as "No Response," the requester gets a follow-up with
                alternative suggestions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
