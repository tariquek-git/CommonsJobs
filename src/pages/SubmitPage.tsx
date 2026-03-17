import { useEffect } from 'react';
import { usePostHog } from '@posthog/react';
import Header from '../components/Header';
import SubmitForm from '../components/SubmitForm';

export default function SubmitPage() {
  const posthog = usePostHog();

  useEffect(() => {
    document.title = 'Submit a Role | Fintech Commons';
    posthog?.capture('page_viewed', { page: 'submit' });
    return () => {
      document.title = 'Fintech Commons | Community-reviewed fintech & banking roles';
    };
  }, [posthog]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Submit a Role</h1>
          <p className="text-gray-500 text-sm mt-1 max-w-lg mx-auto">
            Post a fintech role, whether you're the hiring manager, recruiter, or someone who knows
            them.
          </p>
          <p className="text-sm text-gray-500 mt-2 max-w-lg mx-auto">
            Your listing gets AI-humanized, reviewed by a real person, and shared with a community
            that cares about fintech. Candidates can request warm intros. You decide who to talk to.
          </p>
        </div>

        <SubmitForm />
      </main>
    </div>
  );
}
