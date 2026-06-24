import type { CareerClub, PlayerCard } from '../types';

const NON_CLUB_IDS = new Set(['career-ended', 'free-agent']);

export function getCurrentClub(player: PlayerCard): CareerClub | null {
  const realClubs = player.career.filter((club) => !NON_CLUB_IDS.has(club.clubId));
  return realClubs.findLast((club) => club.toYear === null) ?? realClubs.at(-1) ?? null;
}

export function getClubInitials(name: string) {
  const parts = name
    .replace(/\b(Football Club|Club de Futbol|Futbol Club|FC|CF|SC|SV|VfB|VfL|TSG|RB|Youth|S\.?p\.?A\.?|Ltd|Limited|Association)\b/gi, '')
    .split(/\s+/)
    .map((part) => part.replace(/[^A-Za-z0-9]/g, ''))
    .filter(Boolean);

  const source = parts.length > 0 ? parts : name.split(/\s+/);
  return source.slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'GT';
}
