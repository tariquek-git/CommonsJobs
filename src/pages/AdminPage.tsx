import Header from '../components/Header';
import AdminPanel from '../components/AdminPanel';

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-navy-950">
      <Header />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
        <AdminPanel />
      </main>
    </div>
  );
}
