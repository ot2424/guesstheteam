import { useState } from 'react';
import { getClubLogoSources } from '../../utils/clubLogos';

interface Props {
  name: string;
  logoUrl?: string;
  clubId?: string;
  size?: number;
  className?: string;
}

export function TeamBadge({ name, logoUrl, clubId, size = 36, className = '' }: Props) {
  const sources = getClubLogoSources(logoUrl, clubId);
  const sourceKey = sources.join('|');
  const [failed, setFailed] = useState<{ key: string; count: number }>({ key: '', count: 0 });
  const index = failed.key === sourceKey ? failed.count : 0;
  const source = sources[index];

  if (source) {
    return (
      <img
        key={source}
        src={source}
        referrerPolicy="no-referrer"
        alt={name}
        className={`object-contain ${className}`}
        style={{ width: size, height: size }}
        onError={() => setFailed({ key: sourceKey, count: index + 1 })}
      />
    );
  }

  return (
    <div
      className={`rounded-md border border-gray-700 bg-gray-900 text-gray-300 flex items-center justify-center font-bold ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.32)) }}
      aria-label={name}
    >
      {getClubInitials(name)}
    </div>
  );
}

function getClubInitials(name: string) {
  const parts = name
    .replace(/\b(FC|CF|SC|SV|VfB|VfL|TSG|RB)\b/g, '')
    .split(/\s+/)
    .map((part) => part.replace(/[^A-Za-z0-9]/g, ''))
    .filter(Boolean);

  const source = parts.length > 0 ? parts : name.split(/\s+/);
  return source.slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'FT';
}
