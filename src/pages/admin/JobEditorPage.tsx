import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { getAdminJob, updateJob, updateJobStatus, submitJob } from '../../lib/api';
import type { Job } from '../../lib/types';

const FIELD_SECTIONS = [
  {
    title: 'Basic Info',
    fields: [
      { key: 'title', label: 'Job Title', type: 'text' as const, required: true },
      { key: 'company', label: 'Company', type: 'text' as const, required: true },
      { key: 'location', label: 'Location', type: 'text' as const },
      { key: 'country', label: 'Country', type: 'text' as const },
      { key: 'category', label: 'Category', type: 'text' as const },
    ],
  },
  {
    title: 'Job Details',
    fields: [
      { key: 'salary_range', label: 'Salary Range', type: 'text' as const },
      { key: 'employment_type', label: 'Employment Type', type: 'text' as const },
      { key: 'work_arrangement', label: 'Work Arrangement', type: 'text' as const },
      { key: 'expires_at', label: 'Expires At (ISO date)', type: 'text' as const },
    ],
  },
  {
    title: 'Description',
    fields: [
      { key: 'summary', label: 'Summary (AI-generated)', type: 'textarea' as const },
      { key: 'description', label: 'Full Description', type: 'textarea' as const },
    ],
  },
  {
    title: 'URLs',
    fields: [
      { key: 'apply_url', label: 'Apply URL', type: 'text' as const },
      { key: 'company_url', label: 'Company URL', type: 'text' as const },
      { key: 'company_logo_url', label: 'Logo URL', type: 'text' as const },
    ],
  },
  {
    title: 'Tags & Perks',
    fields: [
      { key: 'tags', label: 'Tags (comma-separated)', type: 'tags' as const },
      { key: 'standout_perks', label: 'Standout Perks (comma-separated)', type: 'tags' as const },
    ],
  },
  {
    title: 'Flags',
    fields: [
      { key: 'featured', label: 'Featured', type: 'boolean' as const },
      { key: 'pinned', label: 'Pinned to Top', type: 'boolean' as const },
      { key: 'warm_intro_ok', label: 'Warm Intro OK', type: 'boolean' as const },
    ],
  },
  {
    title: 'Submitter',
    fields: [
      { key: 'submitter_name', label: 'Submitter Name', type: 'text' as const },
      { key: 'submitter_email', label: 'Submitter Email', type: 'text' as const },
    ],
  },
];

function getInitialForm(job?: Job): Record<string, string | boolean> {
  const form: Record<string, string | boolean> = {};
  for (const section of FIELD_SECTIONS) {
    for (const field of section.fields) {
      if (!job) {
        form[field.key] = field.type === 'boolean' ? false : '';
        continue;
      }
      const val = job[field.key as keyof Job];
      if (field.type === 'tags') {
        form[field.key] = ((val as string[]) || []).join(', ');
      } else if (field.type === 'boolean') {
        form[field.key] = val as boolean;
      } else {
        form[field.key] = (val as string) || '';
      }
    }
  }
  return form;
}

export default function JobEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const { token } = useAdminAuth();
  const navigate = useNavigate();

  const [job, setJob] = useState<Job | null>(null);
  const [form, setForm] = useState<Record<string, string | boolean>>(getInitialForm());
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchJob = useCallback(async () => {
    if (isNew || !token || !id) return;
    setLoading(true);
    try {
      const found = await getAdminJob(token, id);
      setJob(found);
      setForm(getInitialForm(found));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load job');
    } finally {
      setLoading(false);
    }
  }, [id, isNew, token]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  useEffect(() => {
    document.title = isNew ? 'New Job | Admin' : `Edit Job | Admin`;
  }, [isNew]);

  const updateField = (key: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSuccess(null);
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (isNew) {
        // Create via submission endpoint
        const result = await submitJob({
          title: form.title as string,
          company: form.company as string,
          location: (form.location as string) || undefined,
          country: (form.country as string) || undefined,
          description: (form.description as string) || undefined,
          summary: (form.summary as string) || undefined,
          apply_url: (form.apply_url as string) || undefined,
          company_url: (form.company_url as string) || undefined,
          salary_range: (form.salary_range as string) || undefined,
          employment_type: (form.employment_type as string) || undefined,
          work_arrangement: (form.work_arrangement as string) || undefined,
          submitter_name: (form.submitter_name as string) || undefined,
          submitter_email: (form.submitter_email as string) || undefined,
          warm_intro_ok: form.warm_intro_ok as boolean,
          tags: (form.tags as string)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          standout_perks: (form.standout_perks as string)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        });
        setSuccess(`Job created: ${result.submission_ref}`);
        // Navigate to jobs list after a short delay
        setTimeout(() => navigate('/admin/jobs'), 1500);
      } else if (job) {
        // Build updates diff
        const updates: Partial<Job> = {};
        for (const section of FIELD_SECTIONS) {
          for (const field of section.fields) {
            const val = form[field.key];
            if (field.type === 'tags') {
              const arr = (val as string)
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
              if (JSON.stringify(arr) !== JSON.stringify(job[field.key as keyof Job])) {
                (updates as Record<string, unknown>)[field.key] = arr;
              }
            } else if (field.type === 'boolean') {
              if (val !== job[field.key as keyof Job]) {
                (updates as Record<string, unknown>)[field.key] = val;
              }
            } else {
              const strVal = (val as string) || null;
              if (strVal !== (job[field.key as keyof Job] || null)) {
                (updates as Record<string, unknown>)[field.key] = strVal;
              }
            }
          }
        }
        if (Object.keys(updates).length > 0) {
          await updateJob(token, job.id, updates);
          setSuccess('Changes saved');
          fetchJob();
        } else {
          setSuccess('No changes to save');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!token || !job) return;
    try {
      await updateJobStatus(token, job.id, status);
      fetchJob();
      setSuccess(`Status changed to ${status}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change status');
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/admin/jobs')}
            className="text-xs text-gray-500 hover:text-gray-700 mb-1 inline-flex items-center gap-1"
          >
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Back to Jobs
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {isNew ? 'Create New Job' : 'Edit Job'}
          </h1>
        </div>
        {job && (
          <div className="flex items-center gap-2">
            {job.status !== 'active' && (
              <button
                onClick={() => handleStatusChange('active')}
                className="text-xs px-3 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
              >
                Approve
              </button>
            )}
            {job.status !== 'rejected' && (
              <button
                onClick={() => handleStatusChange('rejected')}
                className="text-xs px-3 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Reject
              </button>
            )}
            {job.status !== 'archived' && (
              <button
                onClick={() => handleStatusChange('archived')}
                className="text-xs px-3 py-2 rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition-colors"
              >
                Archive
              </button>
            )}
          </div>
        )}
      </div>

      {/* Job metadata */}
      {job && (
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              job.status === 'active'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : job.status === 'pending'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : job.status === 'rejected'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-gray-100 text-gray-500 border border-gray-200'
            }`}
          >
            {job.status}
          </span>
          {job.submission_ref && <span className="font-mono">{job.submission_ref}</span>}
          <span>Created {new Date(job.created_at).toLocaleDateString()}</span>
          {job.view_count > 0 && <span>{job.view_count} views</span>}
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
          <p className="text-sm text-emerald-700">{success}</p>
        </div>
      )}

      {/* Form sections */}
      {FIELD_SECTIONS.map((section) => (
        <div
          key={section.title}
          className="bg-white rounded-xl border border-gray-200 overflow-hidden"
        >
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-sm font-semibold text-gray-700">{section.title}</h3>
          </div>
          <div className="p-5 space-y-4">
            {section.fields.map((field) => (
              <div key={field.key}>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  {field.label}
                  {'required' in field && field.required && (
                    <span className="text-red-400 ml-0.5">*</span>
                  )}
                </label>
                {field.type === 'boolean' ? (
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form[field.key] as boolean}
                      onChange={(e) => updateField(field.key, e.target.checked)}
                      className="rounded border-gray-300 text-brand-500 focus:ring-brand-500 h-4 w-4"
                    />
                    <span className="text-sm text-gray-700">{form[field.key] ? 'Yes' : 'No'}</span>
                  </label>
                ) : field.type === 'textarea' ? (
                  <textarea
                    value={form[field.key] as string}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    rows={5}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300"
                  />
                ) : (
                  <input
                    type="text"
                    value={form[field.key] as string}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Save bar */}
      <div className="sticky bottom-0 lg:bottom-0 bg-white border-t border-gray-200 -mx-6 lg:-mx-8 px-6 lg:px-8 py-4 flex items-center justify-between">
        <button
          onClick={() => navigate('/admin/jobs')}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !(form.title as string)?.trim() || !(form.company as string)?.trim()}
          className="px-6 py-2.5 rounded-lg bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors disabled:opacity-40"
        >
          {saving ? 'Saving...' : isNew ? 'Create Job' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
