/**
 * Company logo resolution with multiple fallback sources.
 * Tries each source in order until one loads successfully.
 */

/**
 * Returns an ordered list of logo URL candidates for a company.
 * The consumer should try each in order, falling back on error.
 */
export function getLogoCandidates(companyUrl?: string | null, companyLogoUrl?: string | null): string[] {
  const urls: string[] = [];

  // 1. Explicit logo URL (admin-set or scraped)
  if (companyLogoUrl) {
    urls.push(companyLogoUrl);
  }

  if (companyUrl) {
    try {
      const hostname = new URL(companyUrl).hostname;

      // 2. Clearbit (high-quality logos, may fail for smaller companies)
      urls.push(`https://logo.clearbit.com/${hostname}`);

      // 3. Favicon.im (multi-source fallback, apple-touch-icons up to 180px)
      urls.push(`https://favicon.im/${hostname}?larger=true`);

      // 4. Google favicon service (reliable, works for most domains)
      urls.push(`https://www.google.com/s2/favicons?domain=${hostname}&sz=128`);

      // 5. Icon Horse (guaranteed fallback, never returns broken image)
      urls.push(`https://icon.horse/icon/${hostname}`);

    } catch { /* invalid URL, skip */ }
  }

  // Deduplicate while preserving order
  return [...new Set(urls)];
}
