import Anthropic from '@anthropic-ai/sdk';
import { getEnv, getEnvInt } from './env.js';
import type { AIResult } from '../shared/types.js';

let aiClient: Anthropic | null = null;

function getAI(): Anthropic | null {
  const key = getEnv('ANTHROPIC_API_KEY');
  if (!key) return null;

  if (!aiClient) {
    aiClient = new Anthropic({ apiKey: key });
  }
  return aiClient;
}

// ── Prompt Versioning ──
export const PROMPT_VERSION = 'v6';

// ── Humanize Job Post ──

const HUMANIZE_SYSTEM = `You are a career insider who rewrites corporate job postings into plain, authentic language that resonates with the specific role type.

CRITICAL STYLE RULE: Every description you write MUST feel unique. Vary your:
- Opening style: sometimes start with the team, sometimes the problem, sometimes the day-to-day, sometimes a question, sometimes a bold statement about the company
- Sentence structure: mix short punchy sentences with longer ones. Use fragments occasionally. Ask a rhetorical question now and then.
- Vocabulary: never reuse the same phrasing across posts. Instead of always saying "you'll be working on", try "the gig is", "day one you're diving into", "think of it as", "your plate looks like", "the core of this is", "what you'd actually do here is"
- Tone color: some posts can be slightly witty, some more direct, some enthusiastic, some calm and matter-of-fact. Match the energy of the role — a scrappy startup role reads different from a senior bank role.
- NEVER start two descriptions the same way. NEVER use the same sentence template twice.

CONTENT CHECK: If the input does NOT look like a legitimate job posting (e.g., spam, offensive content, random text, marketing copy, personal ads), set "rejection" to a brief reason and leave all other fields empty/null.

If pre-extracted metadata is provided, use it as a starting point. Correct any errors you find, but prefer these values over guessing. Focus your effort on the humanized_description and standout_perks.

Your task: Given a job title (may be empty) and corporate job description, return a JSON object with ALL of the following fields:

1. "rejection" — null if this is a real job posting. A brief reason string if it's not (e.g., "Not a job posting", "Spam content").
2. "title" — The job title. Extract from description if not provided. null if rejected.
3. "company" — The company name. null if not found or rejected.
4. "location" — Where the company is headquartered, city/region format (e.g. "Toronto, ON"). If the role is hybrid, use the HQ/office location. If fully remote with no HQ mentioned, use "Remote". null if not found.
5. "country" — Country name (e.g. "Canada", "United States"). null if not found.
6. "company_url" — The company's main website URL if mentioned or inferable. null if not found.
7. "salary_range" — Salary or compensation range if mentioned (e.g. "CAD $120K–$150K", "USD $80K–$100K + equity"). null if not mentioned. Do NOT guess — only extract if explicitly stated.
8. "employment_type" — One of: "Full-time", "Part-time", "Contract", "Internship", "Freelance". null if not clear.
9. "work_arrangement" — One of: "Remote", "Hybrid", "On-site". If hybrid, make sure "location" is set to the office/HQ city. null if not mentioned.
10. "humanized_description" — Rewrite the description in 4-8 sentences. Write like you're telling a friend about this role over coffee. Be specific to what makes THIS role different from every other job with the same title. Pull out the interesting details — the tech stack, the team size, the stage of the product, the real problems they're solving. Every description should feel like it was written by a different person. Empty string if rejected.
11. "standout_perks" — Short punchy tags (1-3 words each) for genuinely interesting things about this role. Examples: "Equity", "Series A", "Small team", "Open source", "Learning budget", "Founder-led", "Profitable", "4-day week".
   - DO NOT include: salary, employment type, work arrangement, or standard benefits (health/dental/PTO).
   - Empty array is fine if nothing stands out. Do NOT pad with generic items.
12. "category" — Classify this role into ONE broad department. Use your best judgment but keep it high-level. Common examples: "Engineering", "Product", "Design", "Data", "Operations", "Sales/BD", "Marketing", "Finance", "Compliance/Risk", "Leadership". Don't over-split — group similar things (e.g. "DevOps" → "Engineering", "Growth" → "Marketing", "Legal" → "Compliance/Risk", "People/HR" → "Operations"). null if rejected.
13. "tags" — 3-6 specific keyword tags for this role. These help candidates find jobs via filters. Use lowercase, concise terms. Examples: "python", "react", "payments", "blockchain", "lending", "aws", "senior", "startup", "series-b", "crypto", "regtech", "banking", "api", "mobile", "defi", "fraud", "underwriting". Pick tags specific enough to be useful but common enough to match similar roles. Empty array if rejected.

Return ONLY a valid JSON object, nothing else:
{
  "rejection": null,
  "title": "...",
  "company": "..." or null,
  "location": "..." or null,
  "country": "..." or null,
  "company_url": "..." or null,
  "salary_range": "..." or null,
  "employment_type": "..." or null,
  "work_arrangement": "..." or null,
  "humanized_description": "...",
  "standout_perks": ["...", "..."],
  "category": "..." or null,
  "tags": ["...", "..."]
}`;

export interface HumanizeResult {
  rejection?: string;
  title?: string;
  company?: string;
  location?: string;
  country?: string;
  company_url?: string;
  salary_range?: string;
  employment_type?: string;
  work_arrangement?: string;
  humanized_description: string;
  standout_perks: string[];
  category?: string;
  tags?: string[];
  prompt_version?: string;
}

const EMPTY_RESULT: HumanizeResult = { humanized_description: '', standout_perks: [] };

export async function humanizeJobPost(
  description: string,
  title: string,
  preExtracted?: Record<string, string | undefined>,
): Promise<AIResult<HumanizeResult>> {
  const ai = getAI();
  if (!ai) {
    return { result: EMPTY_RESULT, fallback: true };
  }

  const timeout = getEnvInt('AI_TIMEOUT_MS', 15000);

  try {
    let userMessage = `Job Title: ${title || 'Unknown'}\n\nJob Description:\n${description.slice(0, 15000)}`;

    if (preExtracted) {
      const known = Object.entries(preExtracted)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');
      if (known) {
        userMessage += `\n\nPre-extracted metadata (confirm or correct):\n${known}`;
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const response = await ai.messages.create(
      {
        model: process.env.AI_HUMANIZE_MODEL || 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: HUMANIZE_SYSTEM,
        messages: [{ role: 'user', content: userMessage }],
      },
      { signal: controller.signal },
    );

    clearTimeout(timer);

    const text = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '';
    if (!text) {
      return { result: EMPTY_RESULT, fallback: true };
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { result: EMPTY_RESULT, fallback: true };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      result: {
        rejection: parsed.rejection || undefined,
        title: parsed.title || undefined,
        company: parsed.company || undefined,
        location: parsed.location || undefined,
        country: parsed.country || undefined,
        company_url: parsed.company_url || undefined,
        salary_range: parsed.salary_range || undefined,
        employment_type: parsed.employment_type || undefined,
        work_arrangement: parsed.work_arrangement || undefined,
        humanized_description: parsed.humanized_description || '',
        standout_perks: Array.isArray(parsed.standout_perks) ? parsed.standout_perks : [],
        category: parsed.category || undefined,
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        prompt_version: PROMPT_VERSION,
      },
      fallback: false,
    };
  } catch (err: unknown) {
    const { logger } = await import('./logger.js');
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    logger.error('AI humanize error', { endpoint: 'ai/humanize', error: err, isTimeout });
    return {
      result: { ...EMPTY_RESULT, prompt_version: PROMPT_VERSION },
      fallback: true,
      ...(isTimeout ? { error_type: 'timeout' as const } : {}),
    };
  }
}

// ── URL Scraping ──

export interface ScrapeResult {
  title?: string;
  company?: string;
  description?: string;
  location?: string;
  country?: string;
  company_url?: string;
  salary_range?: string;
  employment_type?: string;
  work_arrangement?: string;
}

const SCRAPE_SYSTEM = `Extract structured job posting data from webpage content. Return ONLY a valid JSON object with these fields (use null for missing data):
{
  "title": "job title",
  "company": "company name",
  "location": "city, state/province",
  "country": "country name",
  "description": "full job description text",
  "company_url": "company website URL (not the job posting URL)",
  "salary_range": "salary/compensation if explicitly stated, e.g. 'USD $120K-$150K'. null if not mentioned.",
  "employment_type": "Full-time" | "Part-time" | "Contract" | "Internship" | "Freelance" | null,
  "work_arrangement": "Remote" | "Hybrid" | "On-site" | null
}

IMPORTANT:
- Extract salary ONLY if explicitly stated. Do NOT guess.
- For company_url, look for the company's main website, not the careers page URL.
- For location, use the office/HQ location. If purely remote with no location, use null.
- Extract the FULL job description text — do not summarize.`;

export async function scrapeAndExtract(htmlContent: string): Promise<AIResult<ScrapeResult>> {
  const ai = getAI();
  if (!ai) {
    return { result: {}, fallback: true };
  }

  const timeout = getEnvInt('AI_TIMEOUT_MS', 15000);

  try {
    const truncated = htmlContent.slice(0, 20000);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const response = await ai.messages.create(
      {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: SCRAPE_SYSTEM,
        messages: [{ role: 'user', content: `Webpage content:\n${truncated}` }],
      },
      { signal: controller.signal },
    );

    clearTimeout(timer);

    const text = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '';
    if (!text) {
      return { result: {}, fallback: true };
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { result: {}, fallback: true };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      result: {
        title: parsed.title || undefined,
        company: parsed.company || undefined,
        description: parsed.description || undefined,
        location: parsed.location || undefined,
        country: parsed.country || undefined,
        company_url: parsed.company_url || undefined,
        salary_range: parsed.salary_range || undefined,
        employment_type: parsed.employment_type || undefined,
        work_arrangement: parsed.work_arrangement || undefined,
      },
      fallback: false,
    };
  } catch (err: unknown) {
    const { logger } = await import('./logger.js');
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    logger.error('AI scrape error', { endpoint: 'ai/scrape', error: err, isTimeout });
    return {
      result: {},
      fallback: true,
      ...(isTimeout ? { error_type: 'timeout' as const } : {}),
    };
  }
}
