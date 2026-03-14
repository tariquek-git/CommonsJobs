import { GoogleGenAI } from '@google/genai';
import { getEnv, getEnvInt } from './env.js';
import type { AIResult } from '../shared/types.js';

let aiClient: GoogleGenAI | null = null;

function getAI(): GoogleGenAI | null {
  const key = getEnv('GEMINI_API_KEY');
  if (!key) return null;

  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

// ── Humanize Job Post ──

const HUMANIZE_PROMPT = `You are a career insider who rewrites corporate job postings into plain, authentic language that resonates with the specific role type.

Your task: Given a job title and corporate job description, return a JSON object with:
1. "humanized_description" — Rewrite the description in 4-8 sentences using language natural to someone in that role. For example:
   - For a Data Engineer: talk about pipelines, data quality, tooling, and what the day-to-day stack looks like
   - For a Sales role: talk about quota, deal size, territory, and what the sales motion looks like
   - For a Product Manager: talk about roadmap ownership, stakeholder dynamics, and shipping cadence
   Avoid corporate clichés like "leverage", "synergize", "drive initiatives", "cross-functional alignment", "fast-paced environment". Write like you're explaining the role to a friend over coffee.
2. "standout_perks" — An array of unique/noteworthy benefits that go BEYOND the standard baseline. Standard baseline (DO NOT include these): health insurance, dental, vision, 401k/RRSP match, PTO/vacation, sick days, life insurance, disability insurance.
   Only include perks that are genuinely distinctive, for example: "4-day work week", "Unlimited PTO", "Remote-first", "$5K annual learning budget", "Equity for all employees", "Sabbatical after 3 years", "On-site childcare", "Home office stipend", "Mental health days", "Dog-friendly office", "Profit sharing", "Relocation assistance".
   Return an empty array if no standout perks are found.

Return ONLY a valid JSON object, nothing else:
{
  "humanized_description": "...",
  "standout_perks": ["...", "..."]
}

Job Title: {TITLE}

Job Description:
{DESCRIPTION}`;

export interface HumanizeResult {
  humanized_description: string;
  standout_perks: string[];
}

export async function humanizeJobPost(description: string, title: string): Promise<AIResult<HumanizeResult>> {
  const ai = getAI();
  if (!ai) {
    return {
      result: { humanized_description: '', standout_perks: [] },
      fallback: true,
    };
  }

  const timeout = getEnvInt('AI_TIMEOUT_MS', 12000);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const prompt = HUMANIZE_PROMPT
      .replace('{TITLE}', title)
      .replace('{DESCRIPTION}', description.slice(0, 10000));

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    clearTimeout(timer);

    const text = response.text?.trim();
    if (!text) {
      return {
        result: { humanized_description: '', standout_perks: [] },
        fallback: true,
      };
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        result: { humanized_description: '', standout_perks: [] },
        fallback: true,
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      result: {
        humanized_description: parsed.humanized_description || '',
        standout_perks: Array.isArray(parsed.standout_perks) ? parsed.standout_perks : [],
      },
      fallback: false,
    };
  } catch (err) {
    const { logger } = await import('./logger.js');
    logger.error('AI humanize error', { endpoint: 'ai/humanize', error: err });
    return {
      result: { humanized_description: '', standout_perks: [] },
      fallback: true,
    };
  }
}

// ── URL Scraping ──

const SCRAPE_PROMPT = `Extract structured job posting data from this webpage content. Return ONLY a JSON object with these fields (use null for missing data):
{
  "title": "job title",
  "company": "company name",
  "location": "job location",
  "description": "full job description text"
}

Webpage content:
`;

export async function scrapeAndExtract(htmlContent: string): Promise<AIResult<{ title?: string; company?: string; description?: string; location?: string }>> {
  const ai = getAI();
  if (!ai) {
    return { result: {}, fallback: true };
  }

  const timeout = getEnvInt('AI_TIMEOUT_MS', 8000);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const truncated = htmlContent.slice(0, 15000);

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: SCRAPE_PROMPT + truncated,
    });

    clearTimeout(timer);

    const text = response.text?.trim();
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
      },
      fallback: false,
    };
  } catch (err) {
    const { logger } = await import('./logger.js');
    logger.error('AI scrape error', { endpoint: 'ai/scrape', error: err });
    return { result: {}, fallback: true };
  }
}
