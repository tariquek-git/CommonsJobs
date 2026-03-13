import { getSupabase, getJobsTable } from '../../lib/supabase.js';
import { generateJobSummary } from '../../lib/ai.js';

const JSEARCH_KEY = process.env.JSEARCH_API_KEY;
const JSEARCH_HOST = 'jsearch.p.rapidapi.com';
const MAX_SCRAPES_PER_RUN = 100;

interface JSearchJob {
  job_id: string;
  job_title: string;
  employer_name: string;
  employer_logo: string | null;
  employer_website: string | null;
  job_city: string;
  job_state: string;
  job_country: string;
  job_description: string;
  job_apply_link: string;
  job_posted_at_datetime_utc: string;
  job_is_remote: boolean;
}

interface JSearchResponse {
  status: string;
  data: JSearchJob[];
}

const SEARCH_QUERIES = [
  'fintech jobs in Canada',
  'banking technology jobs Canada',
  'payments engineer Canada',
  'financial services technology Canada',
  'compliance analyst fintech Canada',
];

const TAG_KEYWORDS: Record<string, string[]> = {
  payments: ['payment', 'stripe', 'adyen', 'psp', 'acquiring', 'issuing', 'settlement'],
  banking: ['bank', 'core banking', 'deposits', 'lending', 'treasury'],
  compliance: ['compliance', 'aml', 'kyc', 'regulatory', 'fintrac', 'osfi'],
  crypto: ['crypto', 'blockchain', 'defi', 'web3', 'digital assets'],
  'data-engineering': ['data engineer', 'etl', 'pipeline', 'spark', 'airflow', 'dbt'],
  engineering: ['software engineer', 'developer', 'swe', 'backend', 'frontend', 'fullstack'],
  product: ['product manager', 'product owner', 'product lead'],
  risk: ['risk', 'fraud', 'underwriting', 'credit risk'],
  security: ['security', 'infosec', 'cybersecurity', 'soc', 'penetration'],
  remote: ['remote', 'work from home', 'wfh'],
};

function inferTags(title: string, description: string): string[] {
  const text = `${title} ${description}`.toLowerCase();
  const tags: string[] = [];
  for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) {
      tags.push(tag);
    }
  }
  return tags.slice(0, 5);
}

async function fetchJSearchJobs(query: string): Promise<JSearchJob[]> {
  if (!JSEARCH_KEY) return [];

  const params = new URLSearchParams({
    query,
    page: '1',
    num_pages: '1',
    country: 'CA',
    date_posted: 'week',
  });

  try {
    const res = await fetch(`https://${JSEARCH_HOST}/search?${params}`, {
      headers: {
        'x-rapidapi-key': JSEARCH_KEY,
        'x-rapidapi-host': JSEARCH_HOST,
      },
    });

    if (!res.ok) return [];
    const data: JSearchResponse = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
}

export async function runAggregation(): Promise<{ inserted: number; skipped: number; errors: number }> {
  if (!JSEARCH_KEY) {
    return { inserted: 0, skipped: 0, errors: 0 };
  }

  let totalInserted = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  const supabase = getSupabase();
  const table = getJobsTable();

  // Fetch existing apply_urls for dedup
  const { data: existingJobs } = await supabase
    .from(table)
    .select('apply_url')
    .not('apply_url', 'is', null);

  const existingUrls = new Set(existingJobs?.map((j) => j.apply_url) || []);

  for (const query of SEARCH_QUERIES) {
    if (totalInserted >= MAX_SCRAPES_PER_RUN) break;

    const jobs = await fetchJSearchJobs(query);

    for (const job of jobs) {
      if (totalInserted >= MAX_SCRAPES_PER_RUN) break;
      if (!job.job_apply_link || existingUrls.has(job.job_apply_link)) {
        totalSkipped++;
        continue;
      }

      try {
        // AI-generate a humanized summary
        let summary = '';
        let tags: string[] = [];

        if (job.job_description) {
          const aiResult = await generateJobSummary(job.job_description);
          summary = aiResult.result;
          tags = inferTags(job.job_title, job.job_description);
        }

        const location = [job.job_city, job.job_state].filter(Boolean).join(', ');

        const { error } = await supabase.from(table).insert({
          title: job.job_title,
          company: job.employer_name,
          location: location || (job.job_is_remote ? 'Remote' : null),
          country: job.job_country || 'CA',
          description: job.job_description || null,
          summary: summary || null,
          apply_url: job.job_apply_link,
          company_url: job.employer_website || null,
          company_logo_url: job.employer_logo || null,
          source_type: 'aggregated',
          source_name: 'jsearch',
          status: 'active',
          posted_date: job.job_posted_at_datetime_utc || new Date().toISOString(),
          tags,
        });

        if (error) {
          totalErrors++;
        } else {
          totalInserted++;
          existingUrls.add(job.job_apply_link);
        }
      } catch {
        totalErrors++;
      }
    }
  }

  return { inserted: totalInserted, skipped: totalSkipped, errors: totalErrors };
}
