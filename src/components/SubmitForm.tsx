import { useState } from 'react';
import { submitJob, scrapeUrl, humanizeJob } from '../lib/api';
import type { SubmissionPayload } from '../lib/types';
import { useToast } from './Toast';

const STEPS = [
  { label: 'Details', icon: '1' },
  { label: 'Humanize & Submit', icon: '2' },
];

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 flex-1">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
            i < current
              ? 'bg-accent-500 text-white'
              : i === current
              ? 'bg-accent-500 text-white shadow-md shadow-accent-500/25'
              : 'bg-gray-200 dark:bg-navy-800 text-gray-400 dark:text-gray-500'
          }`}>
            {i < current ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : (
              STEPS[i].icon
            )}
          </div>
          {i < total - 1 && (
            <div className={`flex-1 h-0.5 rounded-full transition-all ${
              i < current ? 'bg-accent-500' : 'bg-gray-200 dark:bg-navy-800'
            }`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function SubmitForm() {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
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
    standout_perks: [],
  });
  const [tagInput, setTagInput] = useState('');
  const [perkInput, setPerkInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [humanizing, setHumanizing] = useState(false);
  const [result, setResult] = useState<{ ref: string; message: string } | null>(null);
  const [aiFallback, setAiFallback] = useState(false);
  const [scrapeFailed, setScrapeFailed] = useState(false);
  const [website, setWebsite] = useState('');

  const updateField = (field: keyof SubmissionPayload, value: string | string[]) => {
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
        toast('Could not auto-fill. Please enter details manually.', 'info');
      } else if (res.result) {
        const data = res.result;
        setForm((prev) => ({
          ...prev,
          title: data.title || prev.title,
          company: data.company || prev.company,
          description: data.description || prev.description,
          location: data.location || prev.location,
        }));
        toast('Auto-filled from URL!', 'success');
      }
    } catch {
      setScrapeFailed(true);
      toast('Scraping failed. Enter details manually.', 'error');
    } finally {
      setScraping(false);
    }
  };

  const handleHumanize = async () => {
    if (!form.description || !form.title) return;
    setHumanizing(true);
    setAiFallback(false);
    try {
      const res = await humanizeJob(form.description, form.title);
      if (res.fallback || !res.result.humanized_description) {
        setAiFallback(true);
        toast('AI unavailable. You can still edit and submit manually.', 'info');
      } else {
        updateField('summary', res.result.humanized_description);
        if (res.result.standout_perks.length > 0) {
          updateField('standout_perks', res.result.standout_perks);
        }
        toast('Job post humanized!', 'success');
      }
    } catch {
      setAiFallback(true);
      toast('AI humanizer unavailable', 'error');
    } finally {
      setHumanizing(false);
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

  const handleAddPerk = () => {
    const perk = perkInput.trim();
    if (perk && (!form.standout_perks || form.standout_perks.length < 10) && !form.standout_perks?.includes(perk)) {
      setForm((prev) => ({ ...prev, standout_perks: [...(prev.standout_perks || []), perk] }));
      setPerkInput('');
    }
  };

  const handleRemovePerk = (perk: string) => {
    setForm((prev) => ({ ...prev, standout_perks: prev.standout_perks?.filter((p) => p !== perk) }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload: SubmissionPayload & { website?: string } = { ...form, website };
      const res = await submitJob(payload);
      setResult({ ref: res.submission_ref, message: res.message });
      toast('Submission successful!', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Submission failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const canProceed = (s: number) => {
    if (s === 0) return !!(form.title.trim() && form.company.trim());
    return true;
  };

  if (result) {
    return (
      <div className="surface-elevated p-8 text-center max-w-lg mx-auto animate-scale-in">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-sky-50 dark:bg-sky-950/20 mb-4">
          <svg className="h-8 w-8 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Submitted!</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{result.message}</p>
        <div className="surface-tinted p-4 inline-block rounded-xl">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Reference ID</p>
          <p className="text-lg font-mono font-bold text-accent-600 dark:text-accent-400">{result.ref}</p>
        </div>
        <button
          onClick={() => {
            setResult(null);
            setStep(0);
            setForm({
              title: '', company: '', location: '', country: '',
              description: '', summary: '', apply_url: '', company_url: '',
              tags: [], submitter_email: '', standout_perks: [],
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
    <div className="max-w-2xl mx-auto">
      <StepIndicator current={step} total={STEPS.length} />

      {aiFallback && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 p-3 mb-6">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            AI features are temporarily unavailable. You can still edit and submit manually.
          </p>
        </div>
      )}

      <div className="animate-fade-in">
        {/* Step 0: Job Details + Description */}
        {step === 0 && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Job Details</h3>

            {/* URL Auto-fill */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Job URL (optional)</label>
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
                  {scraping ? (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : 'Auto-fill'}
                </button>
              </div>
              {scrapeFailed && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Could not scrape — fill in manually below.</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Job Title <span className="text-red-500">*</span>
                </label>
                <input type="text" value={form.title} onChange={(e) => updateField('title', e.target.value)} className="input-field" placeholder="Senior Software Engineer" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Company <span className="text-red-500">*</span>
                </label>
                <input type="text" value={form.company} onChange={(e) => updateField('company', e.target.value)} className="input-field" placeholder="Acme Corp" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Location</label>
                <input type="text" value={form.location} onChange={(e) => updateField('location', e.target.value)} className="input-field" placeholder="Toronto, ON" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Country</label>
                <input type="text" value={form.country} onChange={(e) => updateField('country', e.target.value)} className="input-field" placeholder="Canada" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Company Website</label>
              <input type="url" value={form.company_url} onChange={(e) => updateField('company_url', e.target.value)} className="input-field" placeholder="https://company.com" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Job Description</label>
              <textarea
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={8}
                className="input-field resize-y"
                placeholder="Paste the original job description here (corporate-speak welcome — we'll humanize it next)..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tags</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                  className="input-field flex-1"
                  placeholder="e.g., fintech, remote, senior"
                />
                <button type="button" onClick={handleAddTag} className="btn-secondary shrink-0">Add</button>
              </div>
              {form.tags && form.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-gray-100 dark:bg-navy-800 px-2.5 py-1 text-xs text-gray-600 dark:text-gray-400">
                      {tag}
                      <button type="button" onClick={() => handleRemoveTag(tag)} className="text-gray-400 hover:text-red-500 ml-0.5">&times;</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 1: Humanize + Review + Submit */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Humanize & Review</h3>
              <button
                type="button"
                onClick={handleHumanize}
                disabled={!form.description || !form.title || humanizing}
                className="btn-primary text-xs disabled:opacity-40"
              >
                {humanizing ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 mr-1.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Humanizing...
                  </>
                ) : (
                  <>
                    <svg className="h-3.5 w-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    Humanize with AI
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-3">
              AI rewrites the corporate description into plain language tailored to the role and highlights standout perks.
            </p>

            {/* Humanized summary */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Humanized Description</label>
              <textarea
                value={form.summary}
                onChange={(e) => updateField('summary', e.target.value)}
                rows={5}
                className="input-field resize-y"
                placeholder="Click 'Humanize with AI' above, or write your own plain-language description..."
              />
            </div>

            {/* Standout perks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Standout Perks
                <span className="text-xs text-gray-400 dark:text-gray-500 ml-2 font-normal">Beyond the usual 401k, dental, vision</span>
              </label>
              {form.standout_perks && form.standout_perks.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.standout_perks.map((perk) => (
                    <span key={perk} className="inline-flex items-center gap-1 rounded-md bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/30 px-2.5 py-1 text-xs text-sky-700 dark:text-sky-400">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                      </svg>
                      {perk}
                      <button type="button" onClick={() => handleRemovePerk(perk)} className="text-sky-400 hover:text-red-500 ml-0.5">&times;</button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={perkInput}
                  onChange={(e) => setPerkInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddPerk(); } }}
                  className="input-field flex-1"
                  placeholder="e.g., 4-day work week, equity, remote-first"
                />
                <button type="button" onClick={handleAddPerk} className="btn-secondary shrink-0">Add</button>
              </div>
            </div>

            {/* Preview card */}
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Preview</p>
              <div className="surface-elevated card-accent-community p-5">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">{form.title || 'Untitled'}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{form.company || 'No company'}</p>
                {form.location && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{form.location}{form.country ? `, ${form.country}` : ''}</p>}
                {form.summary && <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mt-2 line-clamp-3">{form.summary}</p>}
                {form.standout_perks && form.standout_perks.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.standout_perks.slice(0, 3).map((perk) => (
                      <span key={perk} className="inline-flex items-center gap-1 rounded-md bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/30 px-2 py-0.5 text-xs text-sky-700 dark:text-sky-400">
                        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                        </svg>
                        {perk}
                      </span>
                    ))}
                    {form.standout_perks.length > 3 && (
                      <span className="text-xs text-gray-400">+{form.standout_perks.length - 3} more</span>
                    )}
                  </div>
                )}
                {form.tags && form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.tags.map((tag) => (
                      <span key={tag} className="rounded-md bg-gray-100 dark:bg-navy-800 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-400">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Your Email (optional)</label>
              <input type="email" value={form.submitter_email} onChange={(e) => updateField('submitter_email', e.target.value)} className="input-field" placeholder="you@email.com" />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">We'll notify you when your post goes live. Never shared publicly.</p>
            </div>

            {/* Honeypot */}
            <div className="absolute -left-[9999px]" aria-hidden="true">
              <label htmlFor="website">Website</label>
              <input id="website" type="text" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" />
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="btn-secondary disabled:opacity-30"
        >
          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back
        </button>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canProceed(step)}
            className="btn-primary disabled:opacity-40"
          >
            Next
            <svg className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !form.title || !form.company}
            className="btn-primary disabled:opacity-40"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Submitting...
              </>
            ) : (
              <>
                Submit for Review
                <svg className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
