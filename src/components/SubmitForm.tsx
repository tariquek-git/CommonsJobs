import { useState } from 'react';
import { submitJob, scrapeUrl, humanizeJob } from '../lib/api';
import type { SubmissionPayload } from '../lib/types';
import { useToast } from './Toast';
import { usePostHog } from '@posthog/react';

const STEPS = [
  { label: 'Details', icon: '1' },
  { label: 'Humanize & Submit', icon: '2' },
];

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8" role="progressbar" aria-valuenow={current + 1} aria-valuemin={1} aria-valuemax={total} aria-label={`Step ${current + 1} of ${total}`}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 flex-1">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
            i < current
              ? 'bg-indigo-600 text-white'
              : i === current
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
              : 'bg-gray-200 text-gray-400'
          }`}>
            {i < current ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : (
              STEPS[i].icon
            )}
          </div>
          {i < total - 1 && (
            <div className="flex-1 h-1 rounded-full overflow-hidden bg-gray-200">
              <div className={`h-full rounded-full transition-all duration-500 ${
                i < current ? 'w-full bg-indigo-600' : 'w-0'
              }`} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function SubmitForm() {
  const { toast } = useToast();
  const posthog = usePostHog();
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
    submitter_name: '',
    submitter_email: '',
    standout_perks: [],
    warm_intro_ok: true,
  });
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
      toast('Could not auto-fill from URL. Please enter details manually.', 'error');
    } finally {
      setScraping(false);
    }
  };

  const handleHumanize = async () => {
    if (!form.description || !form.title) return;
    setHumanizing(true);
    setAiFallback(false);
    posthog?.capture('job_submission_ai_humanize_used', {
      job_title: form.title,
      company: form.company,
    });
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
    } catch (err) {
      posthog?.captureException(err instanceof Error ? err : new Error(String(err)));
      setAiFallback(true);
      toast('AI humanizer unavailable', 'error');
    } finally {
      setHumanizing(false);
    }
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
      posthog?.capture('job_submitted', {
        job_title: form.title,
        company: form.company,
        location: form.location,
        has_warm_intro: form.warm_intro_ok,
        has_ai_summary: !!form.summary,
        standout_perks_count: form.standout_perks?.length ?? 0,
        submission_ref: res.submission_ref,
      });
      setResult({ ref: res.submission_ref, message: res.message });
      toast('Submission successful!', 'success');
    } catch (err) {
      posthog?.captureException(err instanceof Error ? err : new Error(String(err)));
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
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-xl bg-indigo-50 mb-4">
          <svg className="h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">You're in the queue</h2>
        <p className="text-gray-600 text-sm mb-1">{result.message}</p>
        <p className="text-gray-600 text-xs mb-4">I'll personally review this and get it live as soon as I can. No bots here.</p>
        <div className="surface-tinted p-4 inline-block rounded-xl">
          <p className="text-xs text-gray-600 mb-1">Reference ID</p>
          <p className="text-lg font-mono font-bold text-indigo-600">{result.ref}</p>
        </div>
        <button
          onClick={() => {
            setResult(null);
            setStep(0);
            setForm({
              title: '', company: '', location: '', country: '',
              description: '', summary: '', apply_url: '', company_url: '',
              tags: [], submitter_name: '', submitter_email: '', standout_perks: [],
              warm_intro_ok: true,
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
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 mb-6" role="alert">
          <p className="text-xs text-amber-700">
            AI features are temporarily unavailable. You can still edit and submit manually.
          </p>
        </div>
      )}

      <div className="animate-fade-in">
        {/* Step 0: Job Details + Description */}
        {step === 0 && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Job Details</h3>

            {/* Scout's honor callout */}
            <div className="rounded-xl bg-indigo-50/50 border border-indigo-200/40 p-4">
              <div className="flex gap-3">
                <div className="shrink-0 mt-0.5">
                  <svg className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-indigo-700 mb-0.5">Scout's honor</p>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Every role posted here is personally reviewed before it goes live.
                    No spam, no ghost listings.
                    If it's on the board, it's real.
                  </p>
                </div>
              </div>
            </div>

            {/* URL Auto-fill */}
            <div>
              <label htmlFor="submit-apply-url" className="block text-sm font-medium text-gray-700 mb-1.5">Job URL (optional)</label>
              <div className="flex gap-2">
                <input
                  id="submit-apply-url"
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
                  aria-busy={scraping}
                >
                  {scraping ? (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : 'Auto-fill'}
                </button>
              </div>
              {scrapeFailed && (
                <p className="text-xs text-amber-600 mt-1" role="alert">Could not scrape — fill in manually below.</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="submit-title" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Job Title <span className="text-red-500" aria-hidden="true">*</span>
                  <span className="sr-only">(required)</span>
                </label>
                <input id="submit-title" type="text" value={form.title} onChange={(e) => updateField('title', e.target.value)} className="input-field" placeholder="Senior Software Engineer" required aria-required="true" />
              </div>
              <div>
                <label htmlFor="submit-company" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Company <span className="text-red-500" aria-hidden="true">*</span>
                  <span className="sr-only">(required)</span>
                </label>
                <input id="submit-company" type="text" value={form.company} onChange={(e) => updateField('company', e.target.value)} className="input-field" placeholder="Acme Corp" required aria-required="true" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="submit-location" className="block text-sm font-medium text-gray-700 mb-1.5">Location</label>
                <input id="submit-location" type="text" value={form.location} onChange={(e) => updateField('location', e.target.value)} className="input-field" placeholder="Toronto, ON" />
              </div>
              <div>
                <label htmlFor="submit-country" className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
                <input id="submit-country" type="text" value={form.country} onChange={(e) => updateField('country', e.target.value)} className="input-field" placeholder="Canada" />
              </div>
            </div>

            <div>
              <label htmlFor="submit-company-url" className="block text-sm font-medium text-gray-700 mb-1.5">Company Website</label>
              <input id="submit-company-url" type="url" value={form.company_url} onChange={(e) => updateField('company_url', e.target.value)} className="input-field" placeholder="https://company.com" />
            </div>

            <div>
              <label htmlFor="submit-description" className="block text-sm font-medium text-gray-700 mb-1.5">Job Description</label>
              <textarea
                id="submit-description"
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={8}
                className="input-field resize-y"
                placeholder="Paste the original job description here (corporate-speak welcome — I'll humanize it next)..."
              />
            </div>

          </div>
        )}

        {/* Step 1: Humanize + Review + Submit */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Humanize & Review</h3>
              <button
                type="button"
                onClick={handleHumanize}
                disabled={!form.description || !form.title || humanizing}
                className="btn-primary text-xs disabled:opacity-40"
                aria-busy={humanizing}
              >
                {humanizing ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Humanizing...
                  </>
                ) : (
                  <>
                    <svg className="h-3.5 w-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    Humanize with AI
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-gray-600 -mt-3">
              AI rewrites the corporate description into plain language tailored to the role and highlights standout perks.
            </p>

            {/* Humanized summary */}
            <div>
              <label htmlFor="submit-summary" className="block text-sm font-medium text-gray-700 mb-1.5">Humanized Description</label>
              <textarea
                id="submit-summary"
                value={form.summary}
                onChange={(e) => updateField('summary', e.target.value)}
                rows={5}
                className="input-field resize-y"
                placeholder="Click 'Humanize with AI' above, or write your own plain-language description..."
              />
            </div>

            {/* Standout perks */}
            <div>
              <label htmlFor="submit-perk-input" className="block text-sm font-medium text-gray-700 mb-1.5">
                Standout Perks
                <span className="text-xs text-gray-600 ml-2 font-normal">Beyond the usual 401k, dental, vision</span>
              </label>
              {form.standout_perks && form.standout_perks.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.standout_perks.map((perk) => (
                    <span key={perk} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-xs text-indigo-700">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                      </svg>
                      {perk}
                      <button type="button" onClick={() => handleRemovePerk(perk)} className="text-indigo-400 hover:text-red-500 ml-0.5" aria-label={`Remove ${perk}`}>&times;</button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  id="submit-perk-input"
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
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-2">Preview</p>
              <div className="surface-elevated p-5 relative overflow-hidden">
                <h4 className="font-semibold text-gray-900">{form.title || 'Untitled'}</h4>
                <p className="text-sm text-gray-600 mt-0.5">{form.company || 'No company'}</p>
                {form.location && <p className="text-xs text-gray-600 mt-1">{form.location}{form.country ? `, ${form.country}` : ''}</p>}
                {form.summary && <p className="text-sm text-gray-600 leading-relaxed mt-2 line-clamp-3">{form.summary}</p>}
                {form.standout_perks && form.standout_perks.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.standout_perks.slice(0, 3).map((perk) => (
                      <span key={perk} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-xs text-indigo-700">
                        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                        </svg>
                        {perk}
                      </span>
                    ))}
                    {form.standout_perks.length > 3 && (
                      <span className="text-xs text-gray-600">+{form.standout_perks.length - 3} more</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Warm intro opt-in */}
            <div className="rounded-xl bg-indigo-50/50 border border-indigo-200/40 p-4">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.warm_intro_ok}
                  aria-label="Allow warm intros for this role"
                  onClick={() => setForm((prev) => ({ ...prev, warm_intro_ok: !prev.warm_intro_ok }))}
                  className={`shrink-0 mt-0.5 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:ring-offset-2 ${
                    form.warm_intro_ok ? 'bg-indigo-600' : 'bg-gray-300'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                    form.warm_intro_ok ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
                <div>
                  <p className="text-sm font-medium text-gray-900">Allow warm intros for this role</p>
                  <p className="text-xs text-gray-600 leading-relaxed mt-0.5">
                    Candidates can request a warm intro through me. When they do, I'll send you an email with their info so you can connect directly.
                  </p>
                  {form.warm_intro_ok && (
                    <div className="mt-3 rounded-xl bg-white/60 border border-indigo-200/40 p-3">
                      <div className="flex gap-2">
                        <svg className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-xs text-indigo-700 leading-relaxed">
                          <span className="font-semibold">The deal:</span> By opting in, you're committing to look when a candidate reaches out. You don't have to hire them — just engage in good faith. That's what makes this work.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Submitter contact */}
            <div className="rounded-xl bg-gray-50 border border-gray-200/60 p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                <p className="text-sm font-medium text-gray-700">A bit about you</p>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed -mt-1">
                So I can let you know when it's live and connect candidates who want a warm intro. Never shared publicly.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="submit-your-name" className="block text-xs font-medium text-gray-600 mb-1">Your Name</label>
                  <input id="submit-your-name" type="text" value={form.submitter_name || ''} onChange={(e) => updateField('submitter_name', e.target.value)} className="input-field" placeholder="Jane Doe" />
                </div>
                <div>
                  <label htmlFor="submit-your-email" className="block text-xs font-medium text-gray-600 mb-1">Your Email</label>
                  <input id="submit-your-email" type="email" value={form.submitter_email} onChange={(e) => updateField('submitter_email', e.target.value)} className="input-field" placeholder="you@email.com" />
                </div>
              </div>
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
          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back
        </button>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => {
              posthog?.capture('job_submission_step_completed', {
                step: step + 1,
                step_name: STEPS[step].label,
                job_title: form.title,
                company: form.company,
              });
              setStep((s) => s + 1);
            }}
            disabled={!canProceed(step)}
            className="btn-primary disabled:opacity-40"
          >
            Next
            <svg className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !form.title || !form.company}
            className="btn-primary disabled:opacity-40"
            aria-busy={submitting}
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Submitting...
              </>
            ) : (
              <>
                Submit for Review
                <svg className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
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
