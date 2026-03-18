import { useState } from 'react';
import { subscribe } from '../lib/api';
import { usePostHog } from '@posthog/react';

const CATEGORIES = [
  'Engineering',
  'Data',
  'Product',
  'Design',
  'Marketing',
  'Finance',
  'Compliance/Risk',
  'Sales/BD',
  'Operations',
  'Leadership',
];

export default function JobAlertBar() {
  const posthog = usePostHog();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showPrefs, setShowPrefs] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [type, setType] = useState<'candidate' | 'employer'>('candidate');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSubmitting(true);
    setResult(null);

    try {
      const res = await subscribe({
        email: email.trim(),
        name: name.trim() || undefined,
        type,
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
        frequency: 'instant',
      });

      posthog?.capture('job_alert_subscribed', {
        type,
        categories: selectedCategories,
        has_name: !!name.trim(),
      });

      setResult({ ok: true, message: res.message });
      setEmail('');
      setName('');
      setSelectedCategories([]);
      setShowPrefs(false);
    } catch (err) {
      setResult({
        ok: false,
        message: err instanceof Error ? err.message : 'Something went wrong. Try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  if (result?.ok) {
    return (
      <div className="bg-gradient-to-r from-navy-900/5 to-brand-500/5 border border-brand-500/20 rounded-xl p-6 text-center">
        <p className="text-navy-900 font-semibold text-lg">You're in. 🎉</p>
        <p className="text-gray-600 text-sm mt-1">{result.message}</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-navy-900/5 to-brand-500/5 border border-brand-500/20 rounded-xl p-6">
      <div className="text-center mb-4">
        <h3 className="text-navy-900 font-bold text-lg">Get alerts for new roles</h3>
        <p className="text-gray-500 text-sm mt-1">
          Be the first to know when a role matching your interests goes live.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Type toggle */}
        <div className="flex justify-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => setType('candidate')}
            className={`px-3 py-1 rounded-full transition-colors ${
              type === 'candidate'
                ? 'bg-brand-500 text-white'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-brand-500/40'
            }`}
          >
            I'm looking for a role
          </button>
          <button
            type="button"
            onClick={() => setType('employer')}
            className={`px-3 py-1 rounded-full transition-colors ${
              type === 'employer'
                ? 'bg-brand-500 text-white'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-brand-500/40'
            }`}
          >
            I'm hiring
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field flex-1"
          />
          <input
            type="email"
            placeholder="Email address *"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field flex-[2]"
          />
          <button
            type="submit"
            disabled={submitting || !email.trim()}
            className="btn-primary whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Subscribing...' : 'Subscribe'}
          </button>
        </div>

        {/* Category preferences (candidate only) */}
        {type === 'candidate' && (
          <>
            <button
              type="button"
              onClick={() => setShowPrefs(!showPrefs)}
              className="text-xs text-brand-500 hover:text-brand-600 font-medium mx-auto block"
            >
              {showPrefs ? '− Hide preferences' : '+ Set category preferences'}
            </button>

            {showPrefs && (
              <div className="flex flex-wrap gap-1.5 justify-center pt-1">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                      selectedCategories.includes(cat)
                        ? 'bg-brand-500 text-white border-brand-500'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-brand-500/40'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {result && !result.ok && (
          <p className="text-red-600 text-xs text-center">{result.message}</p>
        )}

        <p className="text-[10px] text-gray-400 text-center">
          No spam. Unsubscribe anytime with one click.
        </p>
      </form>
    </div>
  );
}
