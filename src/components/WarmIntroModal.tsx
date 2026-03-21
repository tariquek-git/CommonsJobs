import { useState, useRef, useEffect } from 'react';
import { requestWarmIntro } from '../lib/api';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useFocusTrap } from '../hooks/useFocusTrap';
import type { Job } from '../lib/types';
import { usePostHog } from '@posthog/react';

interface WarmIntroModalProps {
  job: Job;
  onClose: () => void;
}

export default function WarmIntroModal({ job, onClose }: WarmIntroModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  useFocusTrap(overlayRef);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [message, setMessage] = useState('');
  const [showReferral, setShowReferral] = useState(false);
  const [referrerName, setReferrerName] = useState('');
  const [referrerCompany, setReferrerCompany] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const isMobile = useMediaQuery('(max-width: 1023px)');
  const posthog = usePostHog();

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await requestWarmIntro({
        job_id: job.id,
        name: name.trim(),
        email: email.trim(),
        linkedin: linkedin.trim() || undefined,
        message: message.trim() || undefined,
        referrer_name: referrerName.trim() || undefined,
        referrer_company: referrerCompany.trim() || undefined,
      });
      posthog?.capture('warm_intro_requested', {
        job_id: job.id,
        job_title: job.title,
        company: job.company,
        has_linkedin: !!linkedin.trim(),
        has_message: !!message.trim(),
        has_referral: !!(referrerName.trim() || referrerCompany.trim()),
        referrer_name: referrerName.trim() || undefined,
        referrer_company: referrerCompany.trim() || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      posthog?.captureException(err instanceof Error ? err : new Error(String(err)));
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div
        ref={overlayRef}
        className={`fixed inset-0 z-[60] flex bg-black/40 backdrop-blur-sm px-4 animate-fade-in ${
          isMobile ? 'items-end' : 'items-center justify-center'
        }`}
        onClick={(e) => {
          if (e.target === overlayRef.current) onClose();
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Warm intro request submitted"
      >
        <div
          className={`w-full max-w-md glass-panel p-8 text-center animate-scale-in ${
            isMobile ? 'rounded-t-2xl rounded-b-none max-h-[90vh] overflow-y-auto' : ''
          }`}
        >
          {isMobile && (
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>
          )}
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-50 mb-4">
            <svg
              className="h-7 w-7 text-emerald-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Request received</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            I'll reach out to the hiring contact at{' '}
            <span className="font-medium text-gray-800">{job.company}</span> on your behalf. If
            there's a connection, you'll hear from me via email.
          </p>

          <div className="mt-4 rounded-xl bg-amber-50/40 border border-amber-200/60 p-3">
            <p className="text-xs text-amber-700 leading-relaxed">
              <span className="font-semibold">Honest expectation:</span> Not every intro leads to a
              reply. Hiring timelines shift, roles get filled, people get busy. That's not on you.
              I'll do my part.
            </p>
          </div>

          <button onClick={onClose} className="btn-primary mt-6">
            Got it, thanks
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-[60] flex bg-black/40 backdrop-blur-sm px-4 animate-fade-in ${
        isMobile ? 'items-end' : 'items-center justify-center'
      }`}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="warm-intro-title"
    >
      <div
        className={`w-full max-w-md glass-panel p-0 overflow-hidden animate-slide-up ${
          isMobile ? 'rounded-t-2xl rounded-b-none max-h-[90vh] overflow-y-auto' : ''
        }`}
      >
        {isMobile && (
          <div className="flex justify-center pt-3">
            <div className="w-10 h-1 rounded-full bg-gray-300" />
          </div>
        )}

        {/* Header */}
        <div className="p-6 border-b border-gray-200/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
                <svg
                  className="h-5 w-5 text-brand-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                  />
                </svg>
              </div>
              <h3 id="warm-intro-title" className="text-lg font-semibold text-gray-900">
                Warm Intro
              </h3>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="Close"
            >
              <svg
                className="h-4 w-4 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1.5 ml-[50px]">
            for <span className="font-medium text-gray-700">{job.title}</span> at {job.company}
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* How it works */}
          <div className="rounded-xl bg-brand-50/60 border border-brand-200/60 p-4">
            <div className="flex gap-3">
              <div className="shrink-0 mt-0.5">
                <svg
                  className="h-5 w-5 text-brand-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                  />
                </svg>
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-brand-700">
                  I'll take a careful look and put your name in front of the right person.
                </p>
                <p className="text-xs text-brand-500/80 leading-relaxed">
                  Not automated. I review each request and reach out to the job poster on your
                  behalf. The poster opted in, so they're expecting it. Just be genuine.
                </p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  No guarantees. Hiring is messy and timelines shift. But it beats a cold apply.
                </p>
              </div>
            </div>
          </div>

          {/* Form fields */}
          <div className="space-y-3 pt-1">
            <div>
              <label
                htmlFor="warm-intro-name"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Your Name{' '}
                <span className="text-red-400" aria-hidden="true">
                  *
                </span>
                <span className="sr-only">(required)</span>
              </label>
              <input
                id="warm-intro-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                placeholder="Jane Doe"
                autoFocus
                required
                aria-required="true"
              />
            </div>

            <div>
              <label
                htmlFor="warm-intro-email"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Your Email{' '}
                <span className="text-red-400" aria-hidden="true">
                  *
                </span>
                <span className="sr-only">(required)</span>
              </label>
              <input
                id="warm-intro-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@email.com"
                required
                aria-required="true"
              />
              <p className="text-[11px] text-gray-600 mt-1">
                So I can follow up with you. Never shared with anyone.
              </p>
            </div>

            <div>
              <label
                htmlFor="warm-intro-linkedin"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                LinkedIn
                <span className="text-xs text-gray-600 ml-1.5 font-normal">
                  optional, but helps
                </span>
              </label>
              <input
                id="warm-intro-linkedin"
                type="url"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                className="input-field"
                placeholder="linkedin.com/in/yourprofile"
              />
            </div>

            <div>
              <label
                htmlFor="warm-intro-message"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                A bit about you
                <span className="text-xs text-gray-600 ml-1.5 font-normal">optional</span>
              </label>
              <textarea
                id="warm-intro-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="input-field resize-y"
                rows={3}
                maxLength={500}
                placeholder="Tell us about yourself and why this role caught your eye"
              />
              <p className="text-[11px] text-gray-600 mt-1">
                This goes directly to the job poster along with your intro.
              </p>
            </div>

            {/* Referral tracking */}
            <div>
              {!showReferral ? (
                <button
                  type="button"
                  onClick={() => setShowReferral(true)}
                  className="inline-flex items-center gap-1.5 text-xs text-brand-500 hover:text-brand-600 transition-colors font-medium"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z"
                    />
                  </svg>
                  Someone sent me here
                </button>
              ) : (
                <div className="rounded-xl bg-gray-50 border border-gray-200/60 p-3.5 space-y-2.5 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-gray-600">I was sent by…</p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowReferral(false);
                        setReferrerName('');
                        setReferrerCompany('');
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label="Remove referral info"
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={referrerName}
                      onChange={(e) => setReferrerName(e.target.value)}
                      className="input-field flex-1 !py-2 !text-sm"
                      placeholder="Their name"
                    />
                    <span className="text-xs text-gray-400 self-center shrink-0">from</span>
                    <input
                      type="text"
                      value={referrerCompany}
                      onChange={(e) => setReferrerCompany(e.target.value)}
                      className="input-field flex-1 !py-2 !text-sm"
                      placeholder="Company"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Optional — helps me track who's spreading the word and connect dots.
                  </p>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div
              className="rounded-xl bg-red-50 border border-red-200/60 p-3 flex items-center gap-2"
              role="alert"
            >
              <svg
                className="h-4 w-4 text-red-500 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z"
                />
              </svg>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200/60 bg-gray-50/50">
          <p className="text-xs sm:text-sm text-gray-500 sm:text-gray-600">
            I'll get this in front of the right person.
          </p>
          <div className="flex items-center gap-3 ml-auto">
            <button onClick={onClose} className="btn-secondary text-sm">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !name.trim() || !email.trim()}
              className="btn-primary text-sm disabled:opacity-40"
              aria-busy={submitting}
            >
              {submitting ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <svg
                    className="h-4 w-4 mr-1.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                    />
                  </svg>
                  Request Intro
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
