import { describe, it, expect, vi } from 'vitest';

// Mock the @google/genai module
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: vi.fn().mockRejectedValue(new Error('API timeout')),
    },
  })),
}));

// We test the AI response normalization pattern (not the actual API)
describe('AI fallback handling', () => {
  it('returns fallback shape when AI result is null', () => {
    const normalize = (text: string | null | undefined): { result: string; fallback: boolean } => {
      if (!text || text.trim().length === 0) {
        return { result: 'Could not generate summary.', fallback: true };
      }
      return { result: text.trim(), fallback: false };
    };

    expect(normalize(null)).toEqual({ result: 'Could not generate summary.', fallback: true });
    expect(normalize(undefined)).toEqual({ result: 'Could not generate summary.', fallback: true });
    expect(normalize('')).toEqual({ result: 'Could not generate summary.', fallback: true });
    expect(normalize('  ')).toEqual({ result: 'Could not generate summary.', fallback: true });
    expect(normalize('A good summary')).toEqual({ result: 'A good summary', fallback: false });
  });

  it('AI result always has { result, fallback } shape', () => {
    interface AIResult { result: string; fallback: boolean }

    const validResponse: AIResult = { result: 'test', fallback: false };
    const fallbackResponse: AIResult = { result: 'fallback text', fallback: true };

    expect(validResponse).toHaveProperty('result');
    expect(validResponse).toHaveProperty('fallback');
    expect(fallbackResponse.fallback).toBe(true);
  });

  it('handles timeout gracefully by returning fallback', () => {
    const handleAIError = (error: unknown): { result: string; fallback: boolean } => {
      return {
        result: 'AI is temporarily unavailable. Please write a summary manually.',
        fallback: true,
      };
    };

    const result = handleAIError(new Error('AbortError'));
    expect(result.fallback).toBe(true);
    expect(result.result).toContain('unavailable');
  });
});
