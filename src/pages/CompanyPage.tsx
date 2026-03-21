import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePostHog } from '@posthog/react';
import { searchJobs } from '../lib/api';
import type { Job } from '../lib/types';
import Header from '../components/Header';
import CompanyLogo from '../components/CompanyLogo';
import JobCard from '../components/JobCard';
import JobDetailModal from '../components/JobDetailModal';
import BottomNav from '../components/BottomNav';

export default function CompanyPage() {
  const { slug } = useParams<{ slug: string }>();
  const posthog = usePostHog();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const companyName = slug ? decodeURIComponent(slug.replace(/-/g, ' ')) : '';

  useEffect(() => {
    if (!companyName) return;
    document.title = `${companyName} Jobs | Fintech Commons`;
    posthog?.capture('page_viewed', { page: 'company', company: companyName });

    searchJobs({ sort: 'newest', page: 1, limit: 50 })
      .then((res) => {
        const companyJobs = res.jobs.filter(
          (j) => j.company.toLowerCase() === companyName.toLowerCase(),
        );
        setJobs(companyJobs);
      })
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));

    return () => {
      document.title = 'Fintech Commons';
    };
  }, [companyName, posthog]);

  const firstJob = jobs[0];

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!jobs.length) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-gray-500">No active jobs found for "{companyName}"</p>
          <Link to="/" className="btn-primary">
            Browse all jobs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 pb-28 lg:pb-8">
        {/* Company header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="shrink-0">
            <CompanyLogo
              companyName={firstJob.company}
              companyUrl={firstJob.company_url}
              companyLogoUrl={firstJob.company_logo_url}
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{firstJob.company}</h1>
            <div className="flex items-center gap-3 mt-1">
              {firstJob.company_url && (
                <a
                  href={firstJob.company_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-brand-500 hover:text-brand-600 inline-flex items-center gap-1"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
                    />
                  </svg>
                  Website
                </a>
              )}
              <span className="text-sm text-gray-500">
                {jobs.length} open {jobs.length === 1 ? 'role' : 'roles'}
              </span>
            </div>
          </div>
        </div>

        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          All jobs
        </Link>

        {/* Job grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} onSelect={setSelectedJob} className="h-full" />
          ))}
        </div>
      </main>

      <BottomNav />
      <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />
    </div>
  );
}
