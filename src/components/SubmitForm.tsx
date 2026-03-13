import { useState } from 'react';
import { submitJob, generateSummary, scrapeUrl } from '../lib/api';
import type { SubmissionPayload } from '../lib/types';

export default function SubmitForm() {
  const [form, setForm] = useState<SubmissionPayload>({
    title: '',
    company: '',
    location: '',
    country: '',
    description: '',
    summary: '',
    apply_url: '',
    company_url: '',
    tags: [],
    submitter_email: '',
  });
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ ref: string; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiFallback, setAiFallback] = useState(false);
  const [scrapeFailed, setScrapeFailed] = useState(false);

  // Honeypot field
  const [website, setWebsite] = useState('');

  const updateField = (field: keyof SubmissionPayload, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleScrapeUrl = async () => {
    if (!form.apply_url) return;
    setScraping(true);
    setScrapeFailed(false);
    try {
      const res = await scrapeUrl(form.apply_url);
      if (res.fallback) {
        setScrapeFailed(true);
        setAiFallback(true);
      } else if (res.result) {
        const data = res.result;
        if (data.title) updateField('title', data.title);
        if (data.company) updateField('company', data.company);
        if (data.description) updateField('description', data.description);
        if (data.location) updateField('location', data.location);
      }
    } catch {
      setScrapeFailed(true);
    } finally {
      setScraping(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!form.description) return;
    setGenerating(true);
    setAiFallback(false);
    try {
      const res = await generateSummary(form.description);
      updateField('summary', res.result);
      if (res.fallback) setAiFallback(true);
    } catch {
      setAiFallback(true);
    } finally {
      setGenerating(false);
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && (!form.tags || form.tags.length < 10) && !form.tags?.includes(tag)) {
      setForm((prev) => ({ ...prev, tags: [...(prev.tags || []), tag] }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setForm((prev) => ({ ...prev, tags: prev.tags?.filter((t) => t !== tag) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const payload: SubmissionPayload & { website?: string } = { ...form, website };
      const res = await submitJob(payload);
      setResult({ ref: res.submission_ref, message: res.message });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="surface-elevated p-8 text-center max-w-lg mx-auto">
        <div className="text-4xl mb-4">🎉</div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Submitted!</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{result.message}</p>
        <div className="surface-tinted p-4 inline-block">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Reference ID</p>
          <p className="text-lg font-mono font-bold text-indigo-600 dark:text-indigo-400">{result.ref}</p>
        </div>
        <button
          onClick={() => {
            setResult(null);
            setForm({
              title: '', company: '', location: '', country: '',
              description: '', summary: '', apply_url: '', company_url: '',
              tags: [], submitter_email: '',
            });
          }}
          className="btn-secondary mt-6 block mx-auto"
        >
          Submit Another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 p-4">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {aiFallback && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 p-3">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            AI features are temporarily unavailable. You can still submit manually.
          </p>
        </div>
      )}

      {/* URL + Scrape */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Job URL</label>
        <div className="flex gap-2">
          <input
            type="url"
            value={form.apply_url}
            onChange={(e) => updateField('apply_url', e.target.value)}
            placeholder="https://company.com/careers/role"
            className="input-field flex-1"
          />
          <button
            type="button"
            onClick={handleScrapeUrl}
            disabled={!form.apply_url || scraping}
            className="btn-secondary shrink-0 disabled:opacity-40"
          >
            {scraping ? 'Scraping...' : 'Auto-fill'}
          </button>
        </div>
        {scrapeFailed && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
            Could not scrape the URL. You can paste the job description below instead.
          </p>
        )}
      </div>

      {/* Title + Company */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Job Title <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => updateField('title', e.target.value)}
            required
            className="input-field"
            placeholder="Senior Software Engineer"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Company <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <input
            type="text"
            value={form.company}
            onChange={(e) => updateField('company', e.target.value)}
            required
            className="input-field"
            placeholder="Acme Corp"
          />
        </div>
      </div>

      {/* Location + Country */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Location</label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => updateField('location', e.target.value)}
            className="input-field"
            placeholder="Toronto, ON"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Country</label>
          <input
            type="text"
            value={form.country}
            onChange={(e) => updateField('country', e.target.value)}
            className="input-field"
            placeholder="Canada"
          />
        </div>
      </div>

      {/* Company URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Company Website</label>
        <input
          type="url"
          value={form.company_url}
          onChange={(e) => updateField('company_url', e.target.value)}
          className="input-field"
          placeholder="https://company.com"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Job Description
        </label>
        <textarea
          value={form.description}
          onChange={(e) => updateField('description', e.target.value)}
          rows={8}
          className="input-field resize-y"
          placeholder="Paste the full job description here..."
        />
      </div>

      {/* Summary + AI Generate */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Summary</label>
          <button
            type="button"
            onClick={handleGenerateSummary}
            disabled={!form.description || generating}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {generating ? 'Generating...' : 'Generate with AI'}
          </button>
        </div>
        <textarea
          value={form.summary}
          onChange={(e) => updateField('summary', e.target.value)}
          rows={3}
          className="input-field resize-y"
          placeholder="A brief, human-readable summary of the role..."
        />
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tags</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTag();
              }
            }}
            className="input-field flex-1"
            placeholder="e.g., fintech, remote, senior"
          />
          <button type="button" onClick={handleAddTag} className="btn-secondary shrink-0">
            Add
          </button>
        </div>
        {form.tags && form.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {form.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-md bg-gray-100 dark:bg-gray-800 px-2.5 py-1 text-xs text-gray-600 dark:text-gray-400"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 ml-0.5"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Your Email (optional)</label>
        <input
          type="email"
          value={form.submitter_email}
          onChange={(e) => updateField('submitter_email', e.target.value)}
          className="input-field"
          placeholder="you@email.com"
        />
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">So we can follow up if needed. Never shared publicly.</p>
      </div>

      {/* Honeypot - hidden from real users */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          type="text"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <button
        type="submit"
        disabled={submitting || !form.title || !form.company}
        className="btn-primary w-full py-3 text-base disabled:opacity-40"
      >
        {submitting ? 'Submitting...' : 'Submit for Review'}
      </button>
    </form>
  );
}
