import { useState } from 'react';

const CARD_STUDIO_URL = 'https://cardstudio.fintechcommons.io/admin';

export default function CardStudioPage() {
  const [loading, setLoading] = useState(true);

  return (
    <div className="h-[calc(100vh-3.5rem)] lg:h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shrink-0">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Card Studio</h1>
          <p className="text-sm text-gray-500">Manage card designs, templates, and compliance</p>
        </div>
        <a
          href={CARD_STUDIO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          Open in new tab
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
            />
          </svg>
        </a>
      </div>

      {/* Iframe */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              <p className="text-sm text-gray-500">Loading Card Studio...</p>
            </div>
          </div>
        )}
        <iframe
          src={CARD_STUDIO_URL}
          title="Card Studio Admin"
          className="w-full h-full border-0"
          onLoad={() => setLoading(false)}
          allow="clipboard-write"
        />
      </div>
    </div>
  );
}
