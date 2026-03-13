import Header from '../components/Header';
import SubmitForm from '../components/SubmitForm';

export default function SubmitPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-navy-950">
      <Header />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Submit a Role</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Share a fintech or banking role with the community. Submissions are reviewed before going live.
          </p>
        </div>

        <SubmitForm />
      </main>
    </div>
  );
}
