import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getJob, trackClick } from '../lib/api';
import type { Job } from '../lib/types';
import { usePostHog } from '@posthog/react';
import CompanyLogo from '../components/CompanyLogo';

function JsonLd({ job }: { job: Job }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description || job.summary || '',
    datePosted: job.posted_date,
    hiringOrganization: {
      '@type': 'Organization',
      name: job.company,
      ...(job.company_url ? { sameAs: job.company_url } : {}),
      ...(job.company_logo_url ? { logo: job.company_logo_url } : {}),
    },
    ...(job.location
      ? {
          jobLocation: {
            '@type': 'Place',
            address: {
              '@type': 'PostalAddress',
              addressLocality: job.location,
              ...(job.country ? { addressCountry: job.country } : {}),
            },
          },
        }
      : {}),
    ...(job.apply_url ? { url: job.apply_url } : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default function JobPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const posthog = usePostHog();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getJob(id)
      .then((data) => {
        setJob(data);
        document.title = `${data.title} at ${data.company} | Fintech Commons`;
      })
      .catch(() => setError('Job not found'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    return () => {
      document.title = 'Fintech Commons';
    };
  }, []);

  const handleApply = () => {
    if (job?.apply_url) {
      trackClick(job.id);
      posthog?.capture('job_apply_clicked', {
        job_id: job.id,
        job_title: job.title,
        company: job.company,
        source: 'job_page',
      });
      window.open(job.apply_url, '_blank', 'noopener,noreferrer');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">{error || 'Job not found'}</p>
        <Link to="/" className="btn-primary">Back to jobs</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <JsonLd job={job} />

      {/* Nav */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/" className="text-brand-500 hover:text-brand-700 text-sm font-medium">
            &larr; All Jobs
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <article className="surface-elevated p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              <CompanyLogo
                companyName={job.company}
                companyUrl={job.company_url}
                companyLogoUrl={job.company_logo_url}
              />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{job.title}</h1>
              <p className="text-gray-500 mt-1">{job.company}</p>
              <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                {job.location && (
                  <span className="inline-flex items-center gap-1">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0115 0z" />
                    </svg>
                    {job.location}
                  </span>
                )}
                {job.country && <span>{job.country}</span>}
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
              </svg>
              Reviewed
            </span>
            {job.warm_intro_ok && (
              <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                Warm intro available
              </span>
            )}
          </div>

          {/* Standout Perks */}
          {job.standout_perks && job.standout_perks.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-2">What Stands Out</h2>
              <div className="flex flex-wrap gap-2">
                {job.standout_perks.map((perk) => (
                  <span
                    key={perk}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 border border-brand-200"
                  >
                    <svg className="h-3.5 w-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {perk}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {job.summary && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Summary</h2>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                {job.summary}
              </p>
            </div>
          )}

          {/* Description */}
          {job.description && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Full Description</h2>
              <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                {job.description}
              </div>
            </div>
          )}

          {/* Meta + CTA */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              {job.company_url && (
                <a
                  href={job.company_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-500 hover:text-brand-700"
                >
                  Company website
                </a>
              )}
            </div>
            {job.apply_url && (
              <button onClick={handleApply} className="btn-primary">
                Apply Now
                <svg className="h-4 w-4 ml-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                </svg>
              </button>
            )}
          </div>
        </article>
      </main>
    </div>
  );
}
