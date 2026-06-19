import { useState } from 'react';

interface Props {
  name: string;
  logoUrl?: string;
  size?: number;
  className?: string;
}

export function TeamBadge({ name, logoUrl, size = 36, className = '' }: Props) {
  const [imageFailed, setImageFailed] = useState(false);

  if (logoUrl && !imageFailed) {
    return (
      <img
        src={logoUrl}
        alt={name}
        className={`object-contain ${className}`}
        style={{ width: size, height: size }}
        onError={() => setImageFailed(true)}
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
