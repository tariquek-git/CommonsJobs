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

const SUMMARY_PROMPT = `You are a helpful career advisor writing for job seekers. Given a job description, write a clear, humanized summary in 3-5 sentences using plain language.

Rules:
- Write in a warm, direct tone — like a knowledgeable friend explaining the role
- Avoid corporate jargon, buzzwords, and robotic phrasing
- Focus on: what you'd actually do day-to-day, what makes this role interesting, and what kind of person would thrive here
- Never use phrases like "leverage", "synergize", "drive initiatives", "cross-functional alignment"
- Keep it readable and helpful

Job Description:
`;

export async function generateJobSummary(description: string): Promise<AIResult> {
  const ai = getAI();
  if (!ai) {
    return {
      result: 'Summary generation is currently unavailable. Please write a manual summary.',
      fallback: true,
    };
  }

  const timeout = getEnvInt('AI_TIMEOUT_MS', 8000);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: SUMMARY_PROMPT + description,
    });

    clearTimeout(timer);

    const text = response.text?.trim();
    if (!text) {
      return {
        result: 'Could not generate a summary. Please write one manually.',
        fallback: true,
      };
    }

    return { result: text, fallback: false };
  } catch (err) {
    console.error('AI summary generation error:', err);
    return {
      result: 'AI summary generation timed out or failed. Please write a manual summary.',
      fallback: true,
    };
  }
}

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

    // Truncate HTML to avoid token limits
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

    // Try to parse JSON from the response
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
    console.error('AI scrape error:', err);
    return { result: {}, fallback: true };
  }
}
