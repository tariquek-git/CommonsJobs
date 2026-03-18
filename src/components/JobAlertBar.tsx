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
      <div className="bg-gradient-to-r from-[#0A2540]/5 to-[#635BFF]/5 border border-[#635BFF]/20 rounded-xl p-6 text-center">
        <p className="text-[#0A2540] font-semibold text-lg">You're in. 🎉</p>
        <p className="text-slate-600 text-sm mt-1">{result.message}</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-[#0A2540]/5 to-[#635BFF]/5 border border-[#635BFF]/20 rounded-xl p-6">
      <div className="text-center mb-4">
        <h3 className="text-[#0A2540] font-bold text-lg">Get alerts for new roles</h3>
        <p className="text-slate-500 text-sm mt-1">
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
                ? 'bg-[#635BFF] text-white'
                : 'bg-white text-slate-500 border border-slate-200 hover:border-[#635BFF]/40'
            }`}
          >
            I'm looking for a role
          </button>
          <button
            type="button"
            onClick={() => setType('employer')}
            className={`px-3 py-1 rounded-full transition-colors ${
              type === 'employer'
                ? 'bg-[#635BFF] text-white'
                : 'bg-white text-slate-500 border border-slate-200 hover:border-[#635BFF]/40'
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
            className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-[#0A2540] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30 focus:border-[#635BFF]"
          />
          <input
            type="email"
            placeholder="Email address *"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-[2] px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-[#0A2540] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30 focus:border-[#635BFF]"
          />
          <button
            type="submit"
            disabled={submitting || !email.trim()}
            className="px-5 py-2.5 bg-[#635BFF] text-white font-semibold text-sm rounded-lg hover:bg-[#5246E5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
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
              className="text-xs text-[#635BFF] hover:text-[#5246E5] font-medium mx-auto block"
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
                        ? 'bg-[#635BFF] text-white border-[#635BFF]'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-[#635BFF]/40'
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

        <p className="text-[10px] text-slate-400 text-center">
          No spam. Unsubscribe anytime with one click.
        </p>
      </form>
    </div>
  );
}
