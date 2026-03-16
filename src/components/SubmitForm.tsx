import { useState, useRef } from 'react';
import { submitJob, scrapeUrl, humanizeJob, ApiError } from '../lib/api';
import type { SubmissionPayload } from '../lib/types';
import { useToast } from './Toast';
import { usePostHog } from '@posthog/react';

export default function SubmitForm() {
  const { toast } = useToast();
  const posthog = usePostHog();
  const formSectionRef = useRef<HTMLDivElement>(null);

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
    salary_range: '',
    employment_type: '',
    work_arrangement: '',
  });
  const [perkInput, setPerkInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [humanizing, setHumanizing] = useState(false);
  const [result, setResult] = useState<{ ref: string; message: string } | null>(null);
  const [aiFallback, setAiFallback] = useState(false);
  const [scrapeFailed, setScrapeFailed] = useState(false);
  const [website, setWebsite] = useState('');
  const [aiFilledFields, setAiFilledFields] = useState<string[]>([]);
  const [aiMissingFields, setAiMissingFields] = useState<string[]>([]);
  const [aiOriginalSummary, setAiOriginalSummary] = useState<string>('');

  const updateField = (field: keyof SubmissionPayload, value: string | string[] | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleHumanize = async () => {
    if (!form.description) return;
    setHumanizing(true);
    setAiFallback(false);
    const startTime = Date.now();
    posthog?.capture('ai_humanize_started', {
      job_title: form.title,
      company: form.company,
    });
    try {
      const res = await humanizeJob(form.description, form.title, undefined);
      const latencyMs = Date.now() - startTime;

      if (res.fallback || !res.result?.humanized_description) {
        setAiFallback(true);
        const errorType = res.error_type;
        if (errorType === 'timeout') {
          toast('AI took too long — try again or fill in manually.', 'info');
        } else {
          toast('AI temporarily unavailable — you can still edit and submit manually.', 'info');
        }
        posthog?.capture('ai_humanize_failed', {
          latency_ms: latencyMs,
          error_type: errorType || 'fallback',
        });
      } else {
        const r = res.result;

        // Content moderation — check rejection
        if (r.rejection) {
          toast(`This doesn't look like a valid job posting: ${r.rejection}`, 'error');
          posthog?.capture('ai_humanize_rejected', {
            reason: r.rejection,
            latency_ms: latencyMs,
          });
          setHumanizing(false);
          return;
        }

        const filled: string[] = [];
        const missing: string[] = [];

        // Auto-fill all fields AI extracted (only if not already filled)
        if (r.title && !form.title) { updateField('title', r.title); filled.push('Title'); }
        else if (!r.title && !form.title) missing.push('Title');

        if (r.company && !form.company) { updateField('company', r.company); filled.push('Company'); }
        else if (!r.company && !form.company) missing.push('Company');

        if (r.location && !form.location) { updateField('location', r.location); filled.push('Location'); }
        else if (!r.location && !form.location) missing.push('Location');

        if (r.country && !form.country) { updateField('country', r.country); filled.push('Country'); }
        else if (!r.country && !form.country) missing.push('Country');

        if (r.company_url && !form.company_url) { updateField('company_url', r.company_url); filled.push('Website'); }
        else if (!r.company_url && !form.company_url) missing.push('Website');

        if (r.salary_range && !form.salary_range) { updateField('salary_range', r.salary_range); filled.push('Salary'); }

        if (r.employment_type && !form.employment_type) { updateField('employment_type', r.employment_type); filled.push('Employment Type'); }

        if (r.work_arrangement && !form.work_arrangement) { updateField('work_arrangement', r.work_arrangement); filled.push('Work Arrangement'); }

        updateField('summary', r.humanized_description);
        setAiOriginalSummary(r.humanized_description);
        filled.push('Description');

        if (r.standout_perks.length > 0 && (!form.standout_perks || form.standout_perks.length === 0)) {
          updateField('standout_perks', r.standout_perks);
          filled.push('Perks');
        }

        setAiFilledFields(filled);
        setAiMissingFields(missing);

        posthog?.capture('ai_humanize_success', {
          latency_ms: latencyMs,
          fields_filled: filled.length,
          fields_missing: missing.length,
          prompt_version: r.prompt_version,
        });

        if (missing.length > 0) {
          toast(`Humanized! Please fill in: ${missing.join(', ')}`, 'info');
        } else {
          toast('Job post humanized — all fields filled!', 'success');
        }
      }
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      posthog?.capture('ai_humanize_failed', {
        latency_ms: latencyMs,
        error_type: 'exception',
        error_message: err instanceof Error ? err.message : String(err),
      });
      posthog?.captureException(err instanceof Error ? err : new Error(String(err)));
      setAiFallback(true);

      // Differentiate error types
      if (err instanceof ApiError && err.status === 429) {
        toast('Too many requests — try again in a few seconds.', 'error');
      } else {
        toast('AI is temporarily down — you can still submit manually.', 'error');
      }
    } finally {
      setHumanizing(false);
    }
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
          country: data.country || prev.country,
          company_url: data.company_url || prev.company_url,
          salary_range: data.salary_range || prev.salary_range,
          employment_type: data.employment_type || prev.employment_type,
          work_arrangement: data.work_arrangement || prev.work_arrangement,
        }));
        toast('Auto-filled from URL!', 'success');

        // Chain: auto-trigger humanize with pre-extracted metadata
        if (data.description && data.description.trim().length >= 20) {
          const preExtracted: Record<string, string | undefined> = {
            company: data.company,
            location: data.location,
            country: data.country,
            company_url: data.company_url,
            salary_range: data.salary_range,
            employment_type: data.employment_type,
            work_arrangement: data.work_arrangement,
          };
          handleHumanizeWithData(data.description, data.title || form.title, preExtracted);
        }
      }
    } catch {
      setScrapeFailed(true);
      toast('Could not auto-fill from URL. Please enter details manually.', 'error');
    } finally {
      setScraping(false);
    }
  };

  // Humanize with explicit data (used by scrape→humanize chain)
  const handleHumanizeWithData = async (
    description: string,
    title: string,
    preExtracted?: Record<string, string | undefined>,
  ) => {
    setHumanizing(true);
    setAiFallback(false);
    const startTime = Date.now();
    posthog?.capture('ai_humanize_started', {
      job_title: title,
      source: 'auto_chain',
    });
    try {
      const res = await humanizeJob(description, title, preExtracted);
      const latencyMs = Date.now() - startTime;

      if (res.fallback || !res.result?.humanized_description) {
        setAiFallback(true);
        const errorType = res.error_type;
        if (errorType === 'timeout') {
          toast('AI took too long — try again or fill in manually.', 'info');
        } else {
          toast('AI unavailable — fill in details manually.', 'info');
        }
        posthog?.capture('ai_humanize_failed', { latency_ms: latencyMs, error_type: errorType || 'fallback', source: 'auto_chain' });
      } else {
        const r = res.result;

        if (r.rejection) {
          toast(`This doesn't look like a valid job posting: ${r.rejection}`, 'error');
          posthog?.capture('ai_humanize_rejected', { reason: r.rejection, latency_ms: latencyMs });
          setHumanizing(false);
          return;
        }

        const filled: string[] = [];
        const missing: string[] = [];

        setForm((prev) => {
          const updates: Partial<SubmissionPayload> = {};
          if (r.title && !prev.title) { updates.title = r.title; filled.push('Title'); }
          else if (!r.title && !prev.title) missing.push('Title');

          if (r.company && !prev.company) { updates.company = r.company; filled.push('Company'); }
          else if (!r.company && !prev.company) missing.push('Company');

          if (r.location && !prev.location) { updates.location = r.location; filled.push('Location'); }
          else if (!r.location && !prev.location) missing.push('Location');

          if (r.country && !prev.country) { updates.country = r.country; filled.push('Country'); }
          else if (!r.country && !prev.country) missing.push('Country');

          if (r.company_url && !prev.company_url) { updates.company_url = r.company_url; filled.push('Website'); }
          else if (!r.company_url && !prev.company_url) missing.push('Website');

          if (r.salary_range && !prev.salary_range) { updates.salary_range = r.salary_range; filled.push('Salary'); }
          if (r.employment_type && !prev.employment_type) { updates.employment_type = r.employment_type; filled.push('Employment Type'); }
          if (r.work_arrangement && !prev.work_arrangement) { updates.work_arrangement = r.work_arrangement; filled.push('Work Arrangement'); }

          updates.summary = r.humanized_description;
          filled.push('Description');

          if (r.standout_perks.length > 0 && (!prev.standout_perks || prev.standout_perks.length === 0)) {
            updates.standout_perks = r.standout_perks;
            filled.push('Perks');
          }

          return { ...prev, ...updates };
        });

        setAiOriginalSummary(r.humanized_description);
        setAiFilledFields(filled);
        setAiMissingFields(missing);

        posthog?.capture('ai_humanize_success', {
          latency_ms: latencyMs,
          fields_filled: filled.length,
          fields_missing: missing.length,
          prompt_version: r.prompt_version,
          source: 'auto_chain',
        });

        if (missing.length > 0) {
          toast(`Humanized! Please fill in: ${missing.join(', ')}`, 'info');
        } else {
          toast('Scraped & humanized — all fields filled!', 'success');
        }
      }
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      posthog?.capture('ai_humanize_failed', {
        latency_ms: latencyMs,
        error_type: 'exception',
        error_message: err instanceof Error ? err.message : String(err),
        source: 'auto_chain',
      });
      posthog?.captureException(err instanceof Error ? err : new Error(String(err)));
      setAiFallback(true);
      if (err instanceof ApiError && err.status === 429) {
        toast('Too many requests — try again in a few seconds.', 'error');
      } else {
        toast('AI is temporarily down — you can still submit manually.', 'error');
      }
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

  const normalizeUrl = (url: string | undefined): string | undefined => {
    if (!url || !url.trim()) return url;
    let u = url.trim();
    if (u && !u.startsWith('https://') && !u.startsWith('http://')) {
      u = 'https://' + u;
    }
    if (u.startsWith('http://')) {
      u = 'https://' + u.slice(7);
    }
    return u;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Track if user edited the AI summary
      if (aiOriginalSummary && form.summary !== aiOriginalSummary) {
        posthog?.capture('ai_humanize_edited', {
          job_title: form.title,
          company: form.company,
        });
      }

      const payload: SubmissionPayload & { website?: string } = {
        ...form,
        apply_url: normalizeUrl(form.apply_url),
        company_url: normalizeUrl(form.company_url),
        website,
      };
      const res = await submitJob(payload);
      posthog?.capture('job_submitted', {
        job_title: form.title,
        company: form.company,
        location: form.location,
        has_warm_intro: form.warm_intro_ok,
        has_ai_summary: !!form.summary,
        standout_perks_count: form.standout_perks?.length ?? 0,
        submission_ref: res.submission_ref,
        salary_range: form.salary_range || null,
        employment_type: form.employment_type || null,
        work_arrangement: form.work_arrangement || null,
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

  // ── Success Screen ──
  if (result) {
    return (
      <div className="surface-elevated p-8 text-center max-w-lg mx-auto animate-scale-in">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-xl bg-brand-50 mb-4">
          <svg className="h-8 w-8 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">You're in the queue</h2>
        <p className="text-gray-600 text-sm mb-1">{result.message}</p>
        <p className="text-gray-600 text-xs mb-4">I'll review this carefully and get it live as soon as I can. No bots here.</p>
        <div className="surface-tinted p-4 inline-block rounded-xl">
          <p className="text-xs text-gray-600 mb-1">Reference ID</p>
          <p className="text-lg font-mono font-bold text-brand-500">{result.ref}</p>
        </div>
        <button
          onClick={() => {
            setResult(null);
            setForm({
              title: '', company: '', location: '', country: '',
              description: '', summary: '', apply_url: '', company_url: '',
              tags: [], submitter_name: '', submitter_email: '', standout_perks: [],
              warm_intro_ok: true, salary_range: '', employment_type: '', work_arrangement: '',
            });
            setAiFilledFields([]);
            setAiMissingFields([]);
            setAiOriginalSummary('');
          }}
          className="btn-secondary mt-6 block mx-auto"
        >
          Submit Another
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">

      {/* ━━━ Section 1: How It Works — Visual Flow ━━━ */}
      <section className="relative">
        <div className="flex items-center justify-between sm:justify-center sm:gap-4">
          {/* Step 1 */}
          <div className="flex flex-col items-center text-center w-28 sm:w-32">
            <div className="h-14 w-14 rounded-2xl bg-brand-500 flex items-center justify-center shadow-md shadow-brand-500/20 mb-2">
              <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-900">Paste & submit</p>
          </div>

          {/* Arrow */}
          <svg className="h-5 w-5 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>

          {/* Step 2 */}
          <div className="flex flex-col items-center text-center w-28 sm:w-32">
            <div className="h-14 w-14 rounded-2xl bg-brand-500 flex items-center justify-center shadow-md shadow-brand-500/20 mb-2">
              <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-900">AI humanizes</p>
          </div>

          {/* Arrow */}
          <svg className="h-5 w-5 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>

          {/* Step 3 */}
          <div className="flex flex-col items-center text-center w-28 sm:w-32">
            <div className="h-14 w-14 rounded-2xl bg-brand-500 flex items-center justify-center shadow-md shadow-brand-500/20 mb-2">
              <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-900">I review it</p>
          </div>

          {/* Arrow */}
          <svg className="h-5 w-5 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>

          {/* Step 4 */}
          <div className="flex flex-col items-center text-center w-28 sm:w-32">
            <div className="h-14 w-14 rounded-2xl bg-brand-500 flex items-center justify-center shadow-md shadow-brand-500/20 mb-2">
              <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-900">People connect</p>
          </div>
        </div>
      </section>

      {/* ━━━ Section 2: Warm Intro — Compact ━━━ */}
      <section className="rounded-xl bg-brand-50/50 border border-brand-200/40 px-5 py-3">
        <div className="flex items-center gap-3">
          <svg className="h-5 w-5 text-brand-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
          </svg>
          <p className="text-sm text-gray-700">
            <span className="font-semibold text-brand-800">Warm intros:</span> Candidates can ask me to connect them to you. They won't know if you respond — zero pressure. Just give it a real look if you see fit.
          </p>
        </div>
      </section>

      {aiFallback && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3" role="alert">
          <p className="text-xs text-amber-700">
            AI features are temporarily unavailable. You can still edit and submit manually.
          </p>
        </div>
      )}

      {/* ━━━ Section 3: Job URL & Raw Description ━━━ */}
      <section className="surface-elevated p-6 sm:p-8 space-y-5">
        <h2 className="text-lg font-semibold text-gray-900">Paste the job</h2>

        {/* URL + auto-fill */}
        <div>
          <label htmlFor="submit-apply-url" className="block text-sm font-medium text-gray-700 mb-1.5">Job URL</label>
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
              disabled={!form.apply_url || scraping || humanizing}
              className="btn-secondary shrink-0 disabled:opacity-40"
              aria-busy={scraping || humanizing}
            >
              {scraping ? (
                <span className="flex items-center gap-1.5">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Scraping...
                </span>
              ) : humanizing ? (
                <span className="flex items-center gap-1.5">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Humanizing...
                </span>
              ) : 'Auto-fill'}
            </button>
          </div>
          {scrapeFailed && (
            <p className="text-xs text-amber-600 mt-1" role="alert">Couldn't auto-fill — enter details manually.</p>
          )}
          <p className="text-xs text-gray-400 mt-1">Paste URL and click Auto-fill — we'll scrape and humanize in one step.</p>
        </div>

        {/* Full job description */}
        <div>
          <label htmlFor="submit-description" className="block text-sm font-medium text-gray-700 mb-1.5">Full Job Description</label>
          <textarea
            id="submit-description"
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            rows={10}
            className="input-field resize-y"
            placeholder="Paste the full job description here — corporate speak is welcome, that's what the AI is for..."
          />
        </div>
      </section>

      {/* ━━━ Section 4: Humanize + Job Details + Description (combined) ━━━ */}
      <section className="surface-elevated p-6 sm:p-8 space-y-6" ref={formSectionRef}>
        {/* Humanize button bar */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Humanize & fill details</h2>
          <button
            type="button"
            onClick={handleHumanize}
            disabled={!form.description || humanizing}
            className="btn-primary shrink-0 disabled:opacity-40"
            aria-busy={humanizing}
          >
            {humanizing ? (
              <>
                <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Humanizing...
              </>
            ) : (
              <>
                <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                Humanize with AI
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-gray-500 -mt-4">
          Powered by <span className="font-medium text-gray-600">Claude</span> (Anthropic) — AI auto-fills what it can. Review & edit everything below.
        </p>

        {/* AI status banner */}
        {aiFilledFields.length > 0 && (
          <div className="rounded-lg border p-3 space-y-1.5 bg-emerald-50/50 border-emerald-200/60">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-emerald-800">
                <span className="font-semibold">AI filled:</span> {aiFilledFields.join(', ')}
              </p>
            </div>
            {aiMissingFields.length > 0 && (
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <p className="text-xs text-amber-700">
                  <span className="font-semibold">Consider adding:</span> {aiMissingFields.join(', ')}
                </p>
              </div>
            )}
            <p className="text-xs text-gray-500 pl-6">You can update any field — AI is just a starting point.</p>
          </div>
        )}

        {/* Job details grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="col-span-2">
            <label htmlFor="submit-title" className="block text-sm font-medium text-gray-700 mb-1.5">
              Job Title <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input id="submit-title" type="text" value={form.title} onChange={(e) => updateField('title', e.target.value)} className="input-field" placeholder="Senior Software Engineer" required aria-required="true" />
          </div>
          <div className="col-span-2">
            <label htmlFor="submit-company" className="block text-sm font-medium text-gray-700 mb-1.5">
              Company <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input id="submit-company" type="text" value={form.company} onChange={(e) => updateField('company', e.target.value)} className="input-field" placeholder="Stripe" required aria-required="true" />
          </div>
          <div>
            <label htmlFor="submit-location" className="block text-sm font-medium text-gray-700 mb-1.5">Location</label>
            <input id="submit-location" type="text" value={form.location} onChange={(e) => updateField('location', e.target.value)} className="input-field" placeholder="Toronto, ON" />
          </div>
          <div>
            <label htmlFor="submit-country" className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
            <input id="submit-country" type="text" value={form.country} onChange={(e) => updateField('country', e.target.value)} className="input-field" placeholder="Canada" />
          </div>
          <div className="col-span-2">
            <label htmlFor="submit-company-url" className="block text-sm font-medium text-gray-700 mb-1.5">Company Website</label>
            <input id="submit-company-url" type="url" value={form.company_url} onChange={(e) => updateField('company_url', e.target.value)} className="input-field" placeholder="https://company.com" />
          </div>
        </div>

        {/* New fields row: salary, employment type, work arrangement */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="submit-salary" className="block text-sm font-medium text-gray-700 mb-1.5">Salary Range</label>
            <input id="submit-salary" type="text" value={form.salary_range || ''} onChange={(e) => updateField('salary_range', e.target.value)} className="input-field" placeholder="e.g., CAD $120K-$150K" />
          </div>
          <div>
            <label htmlFor="submit-employment-type" className="block text-sm font-medium text-gray-700 mb-1.5">Employment Type</label>
            <select id="submit-employment-type" value={form.employment_type || ''} onChange={(e) => updateField('employment_type', e.target.value)} className="input-field">
              <option value="">Select...</option>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Internship">Internship</option>
              <option value="Freelance">Freelance</option>
            </select>
          </div>
          <div>
            <label htmlFor="submit-work-arrangement" className="block text-sm font-medium text-gray-700 mb-1.5">Work Arrangement</label>
            <select id="submit-work-arrangement" value={form.work_arrangement || ''} onChange={(e) => updateField('work_arrangement', e.target.value)} className="input-field">
              <option value="">Select...</option>
              <option value="Remote">Remote</option>
              <option value="Hybrid">Hybrid</option>
              <option value="On-site">On-site</option>
            </select>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200" />

        {/* Humanized description */}
        <div>
          <label htmlFor="submit-summary" className="block text-sm font-medium text-gray-700 mb-1">
            The real talk
            <span className="font-normal text-gray-500 ml-2">What would someone in this role actually want to know?</span>
          </label>
          <textarea
            id="submit-summary"
            value={form.summary}
            onChange={(e) => updateField('summary', e.target.value)}
            rows={5}
            className="input-field resize-y"
            placeholder="Auto-generated when you click 'Humanize with AI', or write your own..."
          />
        </div>

        {/* Standout perks */}
        <div>
          <label htmlFor="submit-perk-input" className="block text-sm font-medium text-gray-700 mb-1">
            Standout perks
            <span className="font-normal text-gray-500 ml-2">Beyond health, dental, 401k, PTO</span>
          </label>
          {form.standout_perks && form.standout_perks.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {form.standout_perks.map((perk) => (
                <span key={perk} className="inline-flex items-center gap-1 rounded-full bg-brand-50 border border-brand-200 px-2.5 py-1 text-xs text-brand-700">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                  {perk}
                  <button type="button" onClick={() => handleRemovePerk(perk)} className="text-brand-400 hover:text-red-500 ml-0.5" aria-label={`Remove ${perk}`}>&times;</button>
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
      </section>

      {/* ━━━ Section 5: About You + Warm Intro ━━━ */}
      <section className="surface-elevated p-6 sm:p-8 space-y-5">
        <h2 className="text-lg font-semibold text-gray-900">About you</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="submit-your-name" className="block text-sm font-medium text-gray-700 mb-1.5">Your Name</label>
            <input id="submit-your-name" type="text" value={form.submitter_name || ''} onChange={(e) => updateField('submitter_name', e.target.value)} className="input-field" placeholder="Jane Doe" />
          </div>
          <div>
            <label htmlFor="submit-your-email" className="block text-sm font-medium text-gray-700 mb-1.5">Your Email</label>
            <input id="submit-your-email" type="email" value={form.submitter_email} onChange={(e) => updateField('submitter_email', e.target.value)} className="input-field" placeholder="you@email.com" />
          </div>
        </div>

        {/* Warm intro toggle — compact inline */}
        <div className="flex items-center gap-3 rounded-lg bg-gray-50 border border-gray-200/60 px-4 py-3">
          <button
            type="button"
            role="switch"
            aria-checked={form.warm_intro_ok}
            aria-label="Allow warm intros for this role"
            onClick={() => updateField('warm_intro_ok', !form.warm_intro_ok)}
            className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-2 ${
              form.warm_intro_ok ? 'bg-brand-500' : 'bg-gray-300'
            }`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
              form.warm_intro_ok ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
          <p className="text-sm text-gray-700">
            <span className="font-medium">Allow warm intros</span>
            <span className="text-gray-500 ml-1">— I'll notify you when candidates reach out</span>
          </p>
        </div>

        {/* Honeypot */}
        <div className="absolute -left-[9999px]" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input id="website" type="text" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" />
        </div>
      </section>

      {/* ━━━ Preview Card ━━━ */}
      {(form.title || form.company || form.summary) && (
        <section className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Preview — how candidates will see it</p>
          <div className="surface-elevated p-5 relative overflow-hidden">
            <h4 className="font-semibold text-gray-900">{form.title || 'Untitled'}</h4>
            <p className="text-sm text-gray-600 mt-0.5">{form.company || 'No company'}</p>
            {form.location && <p className="text-xs text-gray-600 mt-1">{form.location}{form.country ? `, ${form.country}` : ''}</p>}
            {/* Meta badges */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {form.salary_range && (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200/60">
                  {form.salary_range}
                </span>
              )}
              {form.employment_type && (
                <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {form.employment_type}
                </span>
              )}
              {form.work_arrangement && (
                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-200/60">
                  {form.work_arrangement}
                </span>
              )}
            </div>
            {form.summary && <p className="text-sm text-gray-600 leading-relaxed mt-2 line-clamp-3">{form.summary}</p>}
            {form.standout_perks && form.standout_perks.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.standout_perks.slice(0, 3).map((perk) => (
                  <span key={perk} className="inline-flex items-center gap-1 rounded-full bg-brand-50 border border-brand-200 px-2 py-0.5 text-xs text-brand-700">
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
        </section>
      )}

      {/* ━━━ Submit Button ━━━ */}
      <div className="flex justify-center pb-8">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !form.title || !form.company}
          className="btn-primary px-8 py-3 text-base disabled:opacity-40"
          aria-busy={submitting}
        >
          {submitting ? (
            <>
              <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Submitting...
            </>
          ) : (
            <>
              Submit for Review
              <svg className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
