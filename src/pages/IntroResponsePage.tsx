import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';

type ResponseState = 'loading' | 'confirm' | 'submitting' | 'success' | 'error' | 'already';

export default function IntroResponsePage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const actionFromUrl = params.get('action');
  const [state, setState] = useState<ResponseState>(token ? 'confirm' : 'error');
  const [action, setAction] = useState<string>(actionFromUrl || '');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState(
    token ? '' : 'Invalid link — this intro response link appears to be broken.',
  );

  const handleSubmit = async (selectedAction?: string) => {
    const finalAction = selectedAction || action;
    if (!finalAction) return;
    setAction(finalAction);
    setState('submitting');

    try {
      const res = await fetch('/api/intro-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          action: finalAction,
          note: note.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (data.already_responded) {
        setState('already');
        setMessage(data.message);
      } else if (data.success) {
        setState('success');
        setMessage(data.message);
      } else {
        setState('error');
        setMessage(data.error || 'Something went wrong.');
      }
    } catch {
      setState('error');
      setMessage('Network error. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-900 text-white font-bold text-sm">
            F
          </div>
          <span className="text-lg font-semibold text-gray-900">Fintech Commons</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Loading */}
          {state === 'loading' && (
            <div className="p-8 text-center">
              <div className="h-8 w-8 mx-auto animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            </div>
          )}

          {/* Confirm action */}
          {state === 'confirm' && (
            <div className="p-8 space-y-6">
              <div className="text-center">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-brand-50 mb-4">
                  <svg
                    className="h-7 w-7 text-brand-500"
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
                <h1 className="text-xl font-bold text-gray-900 mb-2">Warm Intro Request</h1>
                <p className="text-sm text-gray-600">
                  Someone requested an introduction through Fintech Commons.
                </p>
              </div>

              {/* Optional note */}
              <div>
                <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Any notes? <span className="text-gray-400 font-normal">optional</span>
                </label>
                <textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none resize-y"
                  rows={2}
                  maxLength={500}
                  placeholder="e.g., Looks great, send the intro! / Role was just filled / Need to see their portfolio first"
                />
              </div>

              {/* Action buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => handleSubmit('accepted')}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                >
                  <svg
                    className="h-5 w-5"
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
                  Yes, make the intro
                </button>
                <button
                  onClick={() => handleSubmit('declined')}
                  className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-colors border border-gray-200"
                >
                  Not right now
                </button>
                <p className="text-center text-xs text-gray-400 pt-1">
                  Questions? Reply to the outreach email instead.
                </p>
              </div>
            </div>
          )}

          {/* Submitting */}
          {state === 'submitting' && (
            <div className="p-8 text-center space-y-4">
              <div className="h-8 w-8 mx-auto animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              <p className="text-sm text-gray-600">Recording your response...</p>
            </div>
          )}

          {/* Success */}
          {state === 'success' && (
            <div className="p-8 text-center space-y-4">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-50">
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
              <h2 className="text-lg font-bold text-gray-900">
                {action === 'accepted'
                  ? "You're connected! Intro emails sent."
                  : 'Thanks for letting us know.'}
              </h2>
              <p className="text-sm text-gray-600">{message}</p>
              <Link
                to="/"
                className="inline-block mt-4 text-brand-500 hover:text-brand-600 font-medium text-sm underline underline-offset-2"
              >
                Visit Fintech Commons
              </Link>
            </div>
          )}

          {/* Already responded */}
          {state === 'already' && (
            <div className="p-8 text-center space-y-4">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50">
                <svg
                  className="h-7 w-7 text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900">Already responded</h2>
              <p className="text-sm text-gray-600">{message}</p>
              <Link
                to="/"
                className="inline-block mt-4 text-brand-500 hover:text-brand-600 font-medium text-sm underline underline-offset-2"
              >
                Visit Fintech Commons
              </Link>
            </div>
          )}

          {/* Error */}
          {state === 'error' && (
            <div className="p-8 text-center space-y-4">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-red-50">
                <svg
                  className="h-7 w-7 text-red-500"
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
              </div>
              <h2 className="text-lg font-bold text-gray-900">Something went wrong</h2>
              <p className="text-sm text-gray-600">{message}</p>
              <p className="text-xs text-gray-400">
                Reply to the email from Tarique instead — he'll handle it.
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Fintech Commons — Real roles. Warm intros.
        </p>
      </div>
    </div>
  );
}
