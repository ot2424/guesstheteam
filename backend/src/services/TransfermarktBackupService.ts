import { env } from '../config/env';
import type { CareerClub, TeamData } from '../types';

interface ClubSearchResponse {
  results?: Array<{ id?: string; name?: string }>;
}

interface ClubProfileResponse {
  id?: string;
  name?: string;
  image?: string;
}

interface PlayerProfileResponse {
  isRetired?: boolean;
  is_retired?: boolean;
  retiredSince?: string | null;
  retired_since?: string | null;
  club?: {
    id?: string | null;
    name?: string | null;
    lastClubId?: string | null;
    last_club_id?: string | null;
    lastClubName?: string | null;
    last_club_name?: string | null;
  };
}

interface PlayerTransfersResponse {
  transfers?: Array<{
    clubFrom?: { id?: string; name?: string };
    club_from?: { id?: string; name?: string };
    clubTo?: { id?: string; name?: string };
    club_to?: { id?: string; name?: string };
    date?: string;
    season?: string;
    upcoming?: boolean;
  }>;
}

type PlayerTransfer = NonNullable<PlayerTransfersResponse['transfers']>[number];

const FREE_AGENT_NAMES = new Set([
  'without club',
  'no club',
  'vereinslos',
  'unattached',
  '-',
]);

export class TransfermarktBackupService {
  private clubLogoCache = new Map<string, string>();
  private playerCareerCache = new Map<string, CareerClub[]>();

  isEnabled() {
    return env.TRANSFERMARKT_BACKUP_ENABLED;
  }

  async enrichTeam(team: TeamData): Promise<TeamData> {
    if (!this.isEnabled()) return team;

    const seedTeam = team as TeamData & { clubId?: string };
    const logoUrl = team.logoUrl || await this.getClubLogo(seedTeam.clubId, team.name);
    const players = await Promise.all(team.players.map(async (player) => ({
      ...player,
      career: await this.getCareer(player.id, player.name, player.career),
    })));

    return {
      ...team,
      logoUrl: logoUrl || team.logoUrl,
      players,
    };
  }

  private async getClubLogo(clubId: string | undefined, clubName: string) {
    const cacheKey = clubId || normalizeName(clubName);
    const cached = this.clubLogoCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const resolvedClubId = clubId || await this.searchClubId(clubName);
    const profile = resolvedClubId
      ? await this.fetchJson<ClubProfileResponse>(`/clubs/${encodeURIComponent(resolvedClubId)}/profile`)
      : null;
    const logoUrl = typeof profile?.image === 'string' ? profile.image : '';

    this.clubLogoCache.set(cacheKey, logoUrl);
    if (resolvedClubId) this.clubLogoCache.set(resolvedClubId, logoUrl);
    return logoUrl;
  }

  private async getCareer(playerId: string, playerName: string, fallbackCareer: CareerClub[]): Promise<CareerClub[]> {
    if (!shouldEnrichCareer(fallbackCareer)) return fallbackCareer;

    const cached = this.playerCareerCache.get(playerId);
    if (cached) return cached;

    const transfers = await this.fetchJson<PlayerTransfersResponse>(`/players/${encodeURIComponent(playerId)}/transfers`);
    const profile = await this.fetchJson<PlayerProfileResponse>(`/players/${encodeURIComponent(playerId)}/profile`);
    const career = buildCareerFromApi(transfers, profile);

    if (career.length === 0) {
      const searchedPlayerId = await this.searchPlayerId(playerName);
      if (searchedPlayerId && searchedPlayerId !== playerId) {
        const searchedCareer: CareerClub[] = await this.getCareer(searchedPlayerId, playerName, fallbackCareer);
        this.playerCareerCache.set(playerId, searchedCareer);
        return searchedCareer;
      }
    }

    const enrichedCareer = await this.addClubLogos(career.length > 0 ? career : fallbackCareer);
    this.playerCareerCache.set(playerId, enrichedCareer);

    return enrichedCareer;
  }

  private async searchPlayerId(playerName: string) {
    const response = await this.fetchJson<{ results?: Array<{ id?: string; name?: string }> }>(
      `/players/search/${encodeURIComponent(playerName)}`,
    );
    const normalized = normalizeName(playerName);
    return response?.results?.find((player) => normalizeName(player.name ?? '') === normalized)?.id
      ?? response?.results?.[0]?.id
      ?? null;
  }

  private async searchClubId(clubName: string) {
    const response = await this.fetchJson<ClubSearchResponse>(`/clubs/search/${encodeURIComponent(clubName)}`);
    const normalized = normalizeName(clubName);
    return response?.results?.find((club) => normalizeName(club.name ?? '') === normalized)?.id
      ?? response?.results?.[0]?.id
      ?? null;
  }

  private async addClubLogos(career: CareerClub[]) {
    return Promise.all(career.map(async (club) => {
      const clubName = getDisplayClubName(club.clubId, club.clubName);
      if (club.logoUrl || isVirtualCareerClub(club.clubId)) {
        return { ...club, clubName };
      }

      return {
        ...club,
        clubName,
        logoUrl: await this.getClubLogo(club.clubId, clubName),
      };
    }));
  }

  private async fetchJson<T>(path: string): Promise<T | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.TRANSFERMARKT_API_TIMEOUT_MS);

    try {
      const url = new URL(path, env.TRANSFERMARKT_API_BASE_URL);
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { accept: 'application/json' },
      });

      if (!response.ok) return null;
      return await response.json() as T;
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function shouldEnrichCareer(career: CareerClub[]) {
  return career.length <= 1 || career.every((club) => !club.logoUrl);
}

function buildCareerFromApi(
  transferResponse: PlayerTransfersResponse | null,
  profile: PlayerProfileResponse | null,
) {
  const career: CareerClub[] = [];

  const transfers = (transferResponse?.transfers ?? [])
    .filter((transfer) => !transfer.upcoming)
    .sort((a, b) => getTransferSortValue(a) - getTransferSortValue(b));

  for (const transfer of transfers) {
    if (transfer.upcoming) continue;

    const year = getTransferYear(transfer.date, transfer.season);
    if (!year) continue;

    const fromClub = transfer.clubFrom ?? transfer.club_from;
    const toClub = transfer.clubTo ?? transfer.club_to;

    if (fromClub?.id && fromClub.name && !isFreeAgentName(fromClub.name)) {
      career.push({
        clubId: fromClub.id,
        clubName: fromClub.name,
        logoUrl: '',
        fromYear: year,
        toYear: year,
      });
    }

    if (toClub?.id && toClub.name && !isFreeAgentName(toClub.name)) {
      career.push({
        clubId: toClub.id,
        clubName: toClub.name,
        logoUrl: '',
        fromYear: year,
        toYear: null,
      });
    }
  }

  const compacted = compactCareer(career);
  closeClubsBeforeNextMove(compacted);
  applyProfileStatus(compacted, profile);
  return compacted;
}

function closeClubsBeforeNextMove(career: CareerClub[]) {
  for (let index = 0; index < career.length - 1; index += 1) {
    const current = career[index];
    const next = career[index + 1];
    if (current.toYear === null || current.toYear > next.fromYear) {
      current.toYear = next.fromYear;
    }
  }
}

function applyProfileStatus(career: CareerClub[], profile: PlayerProfileResponse | null) {
  if (!profile) return;

  if (profile.isRetired ?? profile.is_retired) {
    const retiredYear = getYear(profile.retiredSince ?? profile.retired_since) ?? getLastYear(career);
    closeLastOpenClub(career, retiredYear);

    if (retiredYear) {
      career.push({
        clubId: 'career-ended',
        clubName: 'Karriereende',
        logoUrl: '',
        fromYear: retiredYear,
        toYear: retiredYear,
      });
    }
    return;
  }

  const currentClubName = profile.club?.name ?? '';
  const currentClubId = profile.club?.id ?? '';

  if (!currentClubId || isFreeAgentName(currentClubName)) {
    const year = new Date().getFullYear();
    closeLastOpenClub(career, year);
    career.push({
      clubId: 'free-agent',
      clubName: 'Vereinslos',
      logoUrl: '',
      fromYear: year,
      toYear: null,
    });
  }
}

function compactCareer(career: CareerClub[]) {
  const byClub = new Map<string, CareerClub>();

  for (const item of career.sort((a, b) => a.fromYear - b.fromYear)) {
    const existing = byClub.get(item.clubId);
    if (!existing) {
      byClub.set(item.clubId, { ...item });
      continue;
    }

    existing.fromYear = Math.min(existing.fromYear, item.fromYear);
    existing.toYear = item.toYear === null || existing.toYear === null
      ? null
      : Math.max(existing.toYear, item.toYear);
  }

  return [...byClub.values()].sort((a, b) => a.fromYear - b.fromYear);
}

function closeLastOpenClub(career: CareerClub[], year: number | null) {
  if (!year) return;

  const lastOpenClub = [...career].reverse().find((club) => club.toYear === null);
  if (lastOpenClub) lastOpenClub.toYear = year;
}

function getLastYear(career: CareerClub[]) {
  const years = career.flatMap((club) => [club.fromYear, club.toYear ?? 0]).filter(Boolean);
  return years.length > 0 ? Math.max(...years) : null;
}

function getTransferYear(date: string | undefined, season: string | undefined) {
  return getYear(date) ?? (Number(season?.match(/\d{4}/)?.[0]) || null);
}

function getTransferSortValue(transfer: PlayerTransfer) {
  const dateValue = transfer.date ? Date.parse(transfer.date) : Number.NaN;
  if (Number.isFinite(dateValue)) return dateValue;
  return (getTransferYear(transfer.date, transfer.season) ?? 0) * 1000;
}

function getYear(value: string | null | undefined) {
  if (!value) return null;
  const year = Number(value.slice(0, 4));
  return Number.isFinite(year) && year > 1900 ? year : null;
}

function isFreeAgentName(name: string) {
  return FREE_AGENT_NAMES.has(name.trim().toLowerCase());
}

function isVirtualCareerClub(clubId: string) {
  return clubId === 'free-agent' || clubId === 'career-ended';
}

const CLUB_NAME_ALIASES: Record<string, string> = {
  '399': 'Leeds United',
  '985': 'Manchester United',
  '631': 'Chelsea',
  '31': 'Liverpool',
  '11': 'Arsenal',
  '281': 'Manchester City',
  '762': 'Newcastle United',
  '148': 'Tottenham Hotspur',
};

function getDisplayClubName(clubId: string | undefined, name: string) {
  if (clubId && CLUB_NAME_ALIASES[clubId]) return CLUB_NAME_ALIASES[clubId];

  return name
    .replace(/^Leeds\s+United\s+Association\s+FC$/i, 'Leeds United')
    .replace(/^Newcastle\s+United\s+FC$/i, 'Newcastle United')
    .replace(/^Manchester\s+United\s+Football\s+Club$/i, 'Manchester United')
    .replace(/^Manchester\s+City\s+Football\s+Club$/i, 'Manchester City')
    .replace(/^Chelsea\s+Football\s+Club$/i, 'Chelsea')
    .replace(/^Liverpool\s+Football\s+Club$/i, 'Liverpool')
    .replace(/^Arsenal\s+Football\s+Club$/i, 'Arsenal')
    .replace(/\s+Association\s+FC$/i, '')
    .replace(/\s+Football Club$/i, '')
    .replace(/\s+Futbol Club$/i, '')
    .replace(/\s+Club de Futbol$/i, '')
    .replace(/\s+FC$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function normalizeName(name: string) {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\b(fc|cf|sc|sv|football club|futbol club|calcio)\b/gi, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
}
