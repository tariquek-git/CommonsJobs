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
export const PROMPT_VERSION = 'v8-two-step';

// ── Step 1: Extraction (Haiku — fast, cheap, structured) ──

const EXTRACT_SYSTEM = `You are a structured data extractor for a fintech job board. Given a job title and description, extract ALL factual fields. Be precise — never guess salary or location if not stated.

CONTENT CHECK: If the input is NOT a real job posting (spam, offensive, random text, marketing copy, personal ads), set "rejection" to a brief reason and leave all other fields null/empty.

Return ONLY a valid JSON object:
{
  "rejection": null or "reason string",
  "title": "exact job title" or null,
  "company": "company name" or null,
  "location": "city, state/province" or null,
  "country": "country name" or null,
  "company_url": "company main website URL" or null,
  "salary_range": "e.g. CAD $120K–$150K" or null (ONLY if explicitly stated),
  "employment_type": "Full-time"|"Part-time"|"Contract"|"Internship"|"Freelance" or null,
  "work_arrangement": "Remote"|"Hybrid"|"On-site" or null,
  "category": "Engineering"|"Product"|"Design"|"Data"|"Operations"|"Sales/BD"|"Marketing"|"Finance"|"Compliance/Risk"|"Leadership" or null,
  "tags": ["3-6 lowercase keyword tags for filtering, e.g. python, react, payments, blockchain, senior, startup"],
  "standout_perks": ["1-3 word tags for genuinely interesting things, e.g. Equity, Series A, Small team, 4-day week"],
  "key_details": {
    "tech_stack": ["specific technologies, tools, frameworks mentioned"],
    "team_info": "team size, structure, or reporting line if mentioned" or null,
    "company_stage": "funding stage, revenue, headcount, or traction if mentioned" or null,
    "key_problems": ["the actual projects or problems this role tackles"],
    "differentiators": ["what makes this role different from the same title elsewhere"],
    "role_specific_hooks": ["details that would matter specifically to someone in this category"]
  }
}

RULES:
- For standout_perks: DO NOT include salary, employment type, work arrangement, or standard benefits (health/dental/PTO). Empty array is fine.
- For tags: use lowercase, 3-6 tags. Examples: python, react, payments, blockchain, lending, aws, senior, startup, series-b, crypto, regtech, banking, api, mobile, defi, fraud, underwriting.
- For category: don't over-split (DevOps → Engineering, Growth → Marketing, Legal → Compliance/Risk).
- For work_arrangement: if a role has both in-office and remote days, ALWAYS set this to "Hybrid".
- For location: ALWAYS use the company HQ or office city. For Hybrid roles, use the office location where in-person days happen. If the office city IS the company HQ, just use the city (e.g. "Toronto, ON"). If the office is different from HQ, use the office city. If fully remote with no office, use "Remote".
- key_details: extract EVERYTHING factual that would help write a compelling description. Be thorough.`;

// ── Step 2: Humanize (Sonnet — creative, role-aware voice) ──

const HUMANIZE_SYSTEM = `You write job descriptions for a fintech job board. You'll receive structured data about a role — your ONLY job is to write a killer humanized_description.

VOICE: Write for the SPECIFIC person who'd want this role:
- Engineering: stack, architecture, scale, what they'd build and own
- Data: infrastructure, pipeline complexity, what decisions the data drives
- Product: product stage, ownership, how decisions get made
- Design: design maturity, research access, eng collaboration
- Marketing/Growth: channels, budget, what's working and what isn't
- Finance/Accounting: operational complexity, tech stack, audit stage
- Compliance/Risk: regulatory landscape, jurisdictions, risk surface
- Sales/BD: ICP, deal size, quota, territory
- Ops/Support: volume, tooling, what's broken

STYLE — every description MUST feel unique:
- Opening: vary it. The team, the problem, a question, what's broken, the company stage, a bold claim.
- Structure: mix short punchy sentences with longer ones. Fragments OK. Max one rhetorical question.
- Vocabulary: NEVER reuse phrasing across descriptions. Rotate: "the gig is", "day one you're diving into", "your plate looks like", "the real job here is", "picture this", "here's the deal"
- Energy: match the company. Scrappy startup = casual. Bank = confident. Scale-up = ambitious.
- NEVER start two descriptions the same way.

INCLUDE the most interesting 3-4 things from the extracted details. Skip boilerplate, generic qualifications, standard benefits, and corporate mission statements.

Return ONLY a valid JSON object:
{
  "humanized_description": "8-14 sentences. Go deep — paint the full picture of what this role actually looks like. Specific, authentic, role-aware. Empty string if rejected."
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

// ── Step 1: Extract structured fields (Haiku) ──

interface ExtractedFields {
  rejection?: string;
  title?: string;
  company?: string;
  location?: string;
  country?: string;
  company_url?: string;
  salary_range?: string;
  employment_type?: string;
  work_arrangement?: string;
  category?: string;
  tags: string[];
  standout_perks: string[];
  key_details: {
    tech_stack: string[];
    team_info?: string;
    company_stage?: string;
    key_problems: string[];
    differentiators: string[];
    role_specific_hooks: string[];
  };
}

async function extractJobFields(
  ai: Anthropic,
  description: string,
  title: string,
  preExtracted?: Record<string, string | undefined>,
  timeout = 15000,
): Promise<ExtractedFields | null> {
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
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: EXTRACT_SYSTEM,
      messages: [{ role: 'user', content: userMessage }],
    },
    { signal: controller.signal },
  );

  clearTimeout(timer);

  const text = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '';
  if (!text) return null;

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let parsed: any;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
  return {
    rejection: parsed.rejection || undefined,
    title: parsed.title || undefined,
    company: parsed.company || undefined,
    location: parsed.location || undefined,
    country: parsed.country || undefined,
    company_url: parsed.company_url || undefined,
    salary_range: parsed.salary_range || undefined,
    employment_type: parsed.employment_type || undefined,
    work_arrangement: parsed.work_arrangement || undefined,
    category: parsed.category || undefined,
    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    standout_perks: Array.isArray(parsed.standout_perks) ? parsed.standout_perks : [],
    key_details: {
      tech_stack: Array.isArray(parsed.key_details?.tech_stack)
        ? parsed.key_details.tech_stack
        : [],
      team_info: parsed.key_details?.team_info || undefined,
      company_stage: parsed.key_details?.company_stage || undefined,
      key_problems: Array.isArray(parsed.key_details?.key_problems)
        ? parsed.key_details.key_problems
        : [],
      differentiators: Array.isArray(parsed.key_details?.differentiators)
        ? parsed.key_details.differentiators
        : [],
      role_specific_hooks: Array.isArray(parsed.key_details?.role_specific_hooks)
        ? parsed.key_details.role_specific_hooks
        : [],
    },
  };
}

// ── Step 2: Humanize description (Sonnet) ──

async function humanizeDescription(
  ai: Anthropic,
  fields: ExtractedFields,
  timeout = 15000,
): Promise<string> {
  // Build a rich context message from extracted fields
  const parts: string[] = [];
  parts.push(`Role: ${fields.title || 'Unknown'}`);
  if (fields.company) parts.push(`Company: ${fields.company}`);
  if (fields.category) parts.push(`Category: ${fields.category}`);
  if (fields.location) parts.push(`Location: ${fields.location}`);
  if (fields.work_arrangement) parts.push(`Arrangement: ${fields.work_arrangement}`);
  if (fields.company_url) parts.push(`Company URL: ${fields.company_url}`);

  const kd = fields.key_details;
  if (kd.tech_stack.length > 0) parts.push(`Tech stack: ${kd.tech_stack.join(', ')}`);
  if (kd.team_info) parts.push(`Team: ${kd.team_info}`);
  if (kd.company_stage) parts.push(`Company stage: ${kd.company_stage}`);
  if (kd.key_problems.length > 0)
    parts.push(`Key problems/projects:\n- ${kd.key_problems.join('\n- ')}`);
  if (kd.differentiators.length > 0)
    parts.push(`What makes this different:\n- ${kd.differentiators.join('\n- ')}`);
  if (kd.role_specific_hooks.length > 0)
    parts.push(`Role-specific hooks:\n- ${kd.role_specific_hooks.join('\n- ')}`);
  if (fields.standout_perks.length > 0)
    parts.push(`Standout perks: ${fields.standout_perks.join(', ')}`);

  const userMessage = parts.join('\n');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  const response = await ai.messages.create(
    {
      model: process.env.AI_HUMANIZE_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: HUMANIZE_SYSTEM,
      messages: [{ role: 'user', content: userMessage }],
    },
    { signal: controller.signal },
  );

  clearTimeout(timer);

  const text = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '';
  if (!text) return '';

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.humanized_description || '';
    } catch {
      // If JSON parse fails, fall through to plain text
    }
  }

  // If Sonnet returned plain text instead of JSON, use it directly
  return text;
}

// ── Orchestrator: Two-step humanize ──

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
    // Step 1: Extract structured fields with Haiku (fast, cheap)
    const fields = await extractJobFields(ai, description, title, preExtracted, timeout);

    if (!fields) {
      return { result: EMPTY_RESULT, fallback: true };
    }

    // If rejected, return early — no need for Step 2
    if (fields.rejection) {
      return {
        result: {
          rejection: fields.rejection,
          humanized_description: '',
          standout_perks: [],
          prompt_version: PROMPT_VERSION,
        },
        fallback: false,
      };
    }

    // Step 2: Humanize description with Sonnet (creative, role-aware)
    const humanized = await humanizeDescription(ai, fields, timeout);

    return {
      result: {
        rejection: undefined,
        title: fields.title,
        company: fields.company,
        location: fields.location,
        country: fields.country,
        company_url: fields.company_url,
        salary_range: fields.salary_range,
        employment_type: fields.employment_type,
        work_arrangement: fields.work_arrangement,
        humanized_description: humanized,
        standout_perks: fields.standout_perks,
        category: fields.category,
        tags: fields.tags,
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
- For work_arrangement: if the role has both in-office and remote days, set to "Hybrid".
- For location: use the company HQ or office city. For Hybrid roles, use the office where in-person days happen. If fully remote with no office, use null.
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsed: any;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return { result: {}, fallback: true };
    }
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
