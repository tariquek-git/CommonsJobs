import { useEffect } from 'react';
import Header from '../components/Header';
import AdminPanel from '../components/AdminPanel';

export default function AdminPage() {
  useEffect(() => {
    document.title = 'Admin | Fintech Commons';
    return () => {
      document.title = 'Fintech Commons';
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
        <AdminPanel />

        {/* Sentry test button — only visible in development */}
        {import.meta.env.DEV && (
          <div className="mt-8 p-4 rounded-xl border border-red-200 bg-red-50">
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">
              Sentry Test
            </p>
            <button
              onClick={() => {
                throw new Error('This is your first error!');
              }}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 transition-colors"
            >
              Break the world
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
