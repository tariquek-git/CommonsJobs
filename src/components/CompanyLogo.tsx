import { useState } from 'react';
import { getLogoCandidates } from '../lib/logo';

interface CompanyLogoProps {
  companyName: string;
  companyUrl?: string | null;
  companyLogoUrl?: string | null;
  size?: 'sm' | 'md';
}

export default function CompanyLogo({
  companyName,
  companyUrl,
  companyLogoUrl,
  size = 'md',
}: CompanyLogoProps) {
  const candidates = getLogoCandidates(companyUrl, companyLogoUrl);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const sizeClasses = size === 'sm' ? 'h-12 w-12' : 'h-14 w-14';
  const textSize = size === 'sm' ? 'text-lg' : 'text-base';

  const currentUrl = candidates[candidateIndex];

  const letterFallback = (
    <div
      className={`flex ${sizeClasses} items-center justify-center rounded-xl bg-brand-50 ${textSize} font-bold text-brand-500`}
    >
      {companyName.charAt(0).toUpperCase()}
    </div>
  );

  if (!currentUrl) {
    return letterFallback;
  }

  return (
    <div className={`relative ${sizeClasses}`}>
      <img
        src={currentUrl}
        alt={`${companyName} logo`}
        className={`${sizeClasses} rounded-xl object-contain bg-gray-100 p-1.5 transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0 absolute inset-0'}`}
        onError={() => {
          setLoaded(false);
          setCandidateIndex((i) => i + 1);
        }}
        onLoad={(e) => {
          const img = e.target as HTMLImageElement;
          if (img.naturalWidth < 16 || img.naturalHeight < 16) {
            setLoaded(false);
            setCandidateIndex((i) => i + 1);
          } else {
            setLoaded(true);
          }
        }}
      />
      {!loaded && letterFallback}
    </div>
  );
}
