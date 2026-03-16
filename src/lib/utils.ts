import type { Job } from './types';

/**
 * Share a job via native share sheet (mobile) or copy link to clipboard (desktop).
 * Returns 'native' | 'clipboard' | null indicating the method used.
 */
export async function shareJob(job: Job): Promise<'native' | 'clipboard' | null> {
  const url = `${window.location.origin}/job/${job.id}?utm_source=share`;
  const title = `${job.title} at ${job.company}`;
  const text = `Check out this role on Fintech Commons`;

  // Only use native share on mobile/touch devices where it's actually useful
  const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (isMobile && navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return 'native';
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return null; // User cancelled
      }
    }
  }

  // Fallback: copy to clipboard
  try {
    await navigator.clipboard.writeText(url);
    return 'clipboard';
  } catch {
    // Last resort: textarea hack for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = url;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return 'clipboard';
  }
}

/**
 * Get UTM params from the current URL.
 */
export function getUtmParams(): {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
} {
  const params = new URLSearchParams(window.location.search);
  const result: Record<string, string> = {};
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign'] as const) {
    const val = params.get(key);
    if (val) result[key] = val;
  }
  return result;
}
