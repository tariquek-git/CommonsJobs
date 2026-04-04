import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const FLOW_APP_URL = 'https://flow.fintechcommons.com';

type GalleryDiagram = {
  id: string;
  title: string;
  node_count: number;
  created_at: string;
  updated_at: string;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export default function GalleryPage() {
  const [diagrams, setDiagrams] = useState<GalleryDiagram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/gallery/diagrams')
      .then((r) => r.json())
      .then((d) => {
        setDiagrams(d.diagrams ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load gallery.');
        setLoading(false);
      });
  }, []);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50">
        {/* Hero */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-4 py-12 sm:py-16">
            <div className="flex items-start justify-between flex-wrap gap-6">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
                  Flow of Funds Gallery
                </h1>
                <p className="mt-2 text-lg text-gray-500 max-w-xl">
                  Community-built payment flow diagrams — ACH, SWIFT, card issuing, BaaS, and more.
                </p>
              </div>
              <a
                href={FLOW_APP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Build Your Own
              </a>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="max-w-6xl mx-auto px-4 py-10">
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse"
                >
                  <div className="h-4 bg-gray-100 rounded w-3/4 mb-3" />
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                </div>
              ))}
            </div>
          )}

          {error && <div className="text-center py-16 text-gray-500">{error}</div>}

          {!loading && !error && diagrams.length === 0 && (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🗺️</div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">No public diagrams yet</h2>
              <p className="text-gray-500 mb-6">
                Be the first to share a payment flow diagram with the community.
              </p>
              <a
                href={FLOW_APP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
              >
                Open Flow of Funds
              </a>
            </div>
          )}

          {!loading && diagrams.length > 0 && (
            <>
              <p className="text-sm text-gray-400 mb-6">
                {diagrams.length} diagram{diagrams.length !== 1 ? 's' : ''} shared by the community
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {diagrams.map((d) => (
                  <DiagramCard key={d.id} diagram={d} />
                ))}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function DiagramCard({ diagram }: { diagram: GalleryDiagram }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all p-6 flex flex-col gap-4">
      {/* Title */}
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">
          {diagram.title}
        </h3>
        <div className="mt-2 flex items-center gap-3">
          {diagram.node_count > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {diagram.node_count} nodes
            </span>
          )}
          <span className="text-xs text-gray-300">·</span>
          <span className="text-xs text-gray-400">{timeAgo(diagram.updated_at)}</span>
        </div>
      </div>

      {/* Action */}
      <a
        href={`${FLOW_APP_URL}?load=${diagram.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-1.5 w-full px-4 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300 transition-colors"
      >
        Open in Flow of Funds
        <svg
          className="h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
          />
        </svg>
      </a>
    </div>
  );
}
