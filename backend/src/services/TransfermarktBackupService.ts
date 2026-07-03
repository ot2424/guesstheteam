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

interface ClubDetails {
  name: string;
  logoUrl: string;
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
  'retired',
  'vereinslos',
  'unattached',
  '-',
]);

export class TransfermarktBackupService {
  private clubDetailsCache = new Map<string, ClubDetails>();
  private playerCareerCache = new Map<string, CareerClub[]>();

  isEnabled() {
    return env.TRANSFERMARKT_BACKUP_ENABLED;
  }

  async enrichTeam(team: TeamData): Promise<TeamData> {
    if (!this.isEnabled()) return team;

    return this.enrichTeamData(team);
  }

  async enrichTeamData(team: TeamData): Promise<TeamData> {
    const seedTeam = team as TeamData & { clubId?: string };
    const teamDetails = await this.getClubDetails(seedTeam.clubId, team.name);
    const players = await Promise.all(team.players.map(async (player) => ({
      ...player,
      career: await this.getCareer(player.id, player.name, player.career),
    })));

    return {
      ...team,
      name: teamDetails.name || getDisplayClubName(seedTeam.clubId, team.name),
      logoUrl: team.logoUrl || teamDetails.logoUrl,
      players,
    };
  }

  async enrichCareer(playerId: string, playerName: string, fallbackCareer: CareerClub[]): Promise<CareerClub[]> {
    return this.getCareer(playerId, playerName, fallbackCareer);
  }

  async enrichClub(clubId: string | undefined, clubName: string): Promise<ClubDetails> {
    return this.getClubDetails(clubId, clubName);
  }

  private async getClubDetails(clubId: string | undefined, clubName: string): Promise<ClubDetails> {
    const cacheKey = clubId || normalizeName(clubName);
    const cached = this.clubDetailsCache.get(cacheKey);
    if (cached) return cached;

    const parentClub = getParentClubFallback(clubName);
    const directDetails = getDirectClubDetails(parentClub?.clubId ?? clubId, parentClub?.clubName ?? clubName);
    const profileDetails = await this.fetchClubDetails(clubId, clubName);
    const parentDetails = directDetails?.logoUrl || profileDetails?.logoUrl
      ? null
      : getDirectClubDetails(parentClub?.clubId, parentClub?.clubName ?? clubName)
        ?? await this.fetchClubDetails(parentClub?.clubId, parentClub?.clubName ?? clubName);
    const searchDetails = directDetails?.logoUrl || profileDetails?.logoUrl || parentDetails?.logoUrl
      ? null
      : await this.fetchClubDetails(await this.searchClubId(clubName), clubName);
    const parentSearchDetails = directDetails?.logoUrl || profileDetails?.logoUrl || parentDetails?.logoUrl || searchDetails?.logoUrl
      ? null
      : await this.fetchClubDetails(await this.searchClubId(parentClub?.clubName ?? ''), parentClub?.clubName ?? clubName);

    const details = mergeClubDetails(
      profileDetails,
      directDetails,
      parentDetails,
      searchDetails,
      parentSearchDetails,
      { name: getDisplayClubName(clubId, clubName), logoUrl: '' },
    );

    this.clubDetailsCache.set(cacheKey, details);
    if (clubId) this.clubDetailsCache.set(clubId, details);
    return details;
  }

  private async fetchClubDetails(clubId: string | null | undefined, fallbackName: string): Promise<ClubDetails | null> {
    if (!clubId) return null;

    const profile = await this.fetchJson<ClubProfileResponse>(`/clubs/${encodeURIComponent(clubId)}/profile`);
    if (!profile) return null;

    const name = profile.name ? getDisplayClubName(profile.id ?? clubId, profile.name) : getDisplayClubName(clubId, fallbackName);
    const logoUrl = typeof profile.image === 'string' ? profile.image : getTransfermarktLogoUrl(profile.id ?? clubId);

    if (!name && !logoUrl) return null;
    return { name: name || fallbackName, logoUrl };
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
      if (isVirtualCareerClub(club.clubId)) {
        return { ...club, clubName: getDisplayClubName(club.clubId, club.clubName) };
      }

      const details = await this.getClubDetails(club.clubId, club.clubName);
      const clubName = isLikelyReserveOrYouthClub(club.clubName)
        ? getDisplayClubName(club.clubId, club.clubName)
        : details.name || getDisplayClubName(club.clubId, club.clubName);

      return {
        ...club,
        clubName,
        logoUrl: club.logoUrl || details.logoUrl,
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

function getDirectClubDetails(clubId: string | null | undefined, clubName: string): ClubDetails | null {
  const logoUrl = getTransfermarktLogoUrl(clubId);
  if (!logoUrl) return null;

  return {
    name: getDisplayClubName(clubId ?? undefined, clubName),
    logoUrl,
  };
}

function getTransfermarktLogoUrl(clubId: string | null | undefined) {
  if (!clubId || !/^\d+$/.test(clubId)) return '';
  return `https://tmssl.akamaized.net/images/wappen/big/${clubId}.png`;
}

function mergeClubDetails(...details: Array<ClubDetails | null>) {
  const availableDetails = details.filter((detail): detail is ClubDetails => Boolean(detail));
  const name = availableDetails.find((detail) => detail.name)?.name ?? '';
  const logoUrl = availableDetails.find((detail) => detail.logoUrl)?.logoUrl ?? '';
  return { name, logoUrl };
}

const CLUB_NAME_ALIASES: Record<string, string> = {
  '27': 'Bayern Munich',
  '16': 'Borussia Dortmund',
  '15': 'Bayer Leverkusen',
  '18': 'Borussia Monchengladbach',
  '24': 'Eintracht Frankfurt',
  '3': '1. FC Koln',
  '4': '1. FC Nurnberg',
  '33': 'Schalke 04',
  '35': 'St. Pauli',
  '38': 'Fortuna Dusseldorf',
  '39': 'Mainz 05',
  '41': 'Hamburger SV',
  '42': 'Hannover 96',
  '44': 'Hertha BSC',
  '60': 'SC Freiburg',
  '79': 'VfB Stuttgart',
  '80': 'VfL Bochum',
  '82': 'VfL Wolfsburg',
  '86': 'Werder Bremen',
  '167': 'FC Augsburg',
  '533': 'TSG Hoffenheim',
  '46': 'Inter Milan',
  '5': 'AC Milan',
  '506': 'Juventus',
  '12': 'Roma',
  '6195': 'Napoli',
  '398': 'Lazio',
  '800': 'Atalanta',
  '131': 'Barcelona',
  '418': 'Real Madrid',
  '13': 'Atletico Madrid',
  '621': 'Athletic Bilbao',
  '681': 'Real Sociedad',
  '150': 'Real Betis',
  '940': 'Celta Vigo',
  '583': 'Paris Saint-Germain',
  '1041': 'Lyon',
  '1082': 'Lille',
  '244': 'Marseille',
  '162': 'Monaco',
  '399': 'Leeds United',
  '985': 'Manchester United',
  '631': 'Chelsea',
  '31': 'Liverpool',
  '11': 'Arsenal',
  '281': 'Manchester City',
  '762': 'Newcastle United',
  '148': 'Tottenham Hotspur',
  '1003': 'Leicester City',
  '405': 'Aston Villa',
  '703': 'Nottingham Forest',
  '180': 'Southampton',
  '289': 'Sunderland',
  '379': 'West Ham United',
  '29': 'Everton',
  '294': 'Benfica',
  '720': 'Porto',
  '23826': 'RB Leipzig',
  '610': 'Ajax',
  '383': 'PSV',
  '234': 'Feyenoord',
  '368': 'Sevilla',
  '1049': 'Valencia',
  '1050': 'Villarreal',
  '336': 'Sporting CP',
  '430': 'Fiorentina',
  '1025': 'Bologna',
  '897': 'Deportivo La Coruna',
  '130': 'Parma',
  '1038': 'Sampdoria',
  '416': 'Torino',
  '417': 'Nice',
  '618': 'Saint-Etienne',
};

const PARENT_CLUB_FALLBACKS: Array<{ pattern: RegExp; clubId: string; clubName: string }> = [
  { pattern: /\bBarca\b|\bBarça\b|\bBarcelona\b/i, clubId: '131', clubName: 'Barcelona' },
  { pattern: /\bBayern\b/i, clubId: '27', clubName: 'Bayern Munich' },
  { pattern: /\bInter\b/i, clubId: '46', clubName: 'Inter Milan' },
  { pattern: /\bAtalanta\b/i, clubId: '800', clubName: 'Atalanta' },
  { pattern: /\bMilan\b/i, clubId: '5', clubName: 'AC Milan' },
  { pattern: /\bJuventus\b|\bJuve\b/i, clubId: '506', clubName: 'Juventus' },
  { pattern: /\bRoma\b/i, clubId: '12', clubName: 'Roma' },
  { pattern: /\bLazio\b/i, clubId: '398', clubName: 'Lazio' },
  { pattern: /\bNapoli\b/i, clubId: '6195', clubName: 'Napoli' },
  { pattern: /\bReal Madrid\b/i, clubId: '418', clubName: 'Real Madrid' },
  { pattern: /\bAtletico\b|\bAtl[eé]tico\b/i, clubId: '13', clubName: 'Atletico Madrid' },
  { pattern: /\bParis Saint-Germain\b|\bPSG\b/i, clubId: '583', clubName: 'Paris Saint-Germain' },
  { pattern: /\bManchester City\b/i, clubId: '281', clubName: 'Manchester City' },
  { pattern: /\bManchester United\b/i, clubId: '985', clubName: 'Manchester United' },
  { pattern: /\bLiverpool\b/i, clubId: '31', clubName: 'Liverpool' },
  { pattern: /\bArsenal\b/i, clubId: '11', clubName: 'Arsenal' },
  { pattern: /\bChelsea\b/i, clubId: '631', clubName: 'Chelsea' },
  { pattern: /\bTottenham\b/i, clubId: '148', clubName: 'Tottenham Hotspur' },
  { pattern: /\bNewcastle\b/i, clubId: '762', clubName: 'Newcastle United' },
  { pattern: /\bLeeds\b/i, clubId: '399', clubName: 'Leeds United' },
];

function getParentClubFallback(clubName: string) {
  if (!isLikelyReserveOrYouthClub(clubName)) return null;
  return PARENT_CLUB_FALLBACKS.find((fallback) => fallback.pattern.test(clubName)) ?? null;
}

function isLikelyReserveOrYouthClub(clubName: string) {
  return /\b(Youth|Jugend|U\d{2}|Primavera|Atl[eè]tic|B|II|Reserves?)\b/i.test(clubName);
}

function getDisplayClubName(clubId: string | undefined, name: string) {
  if (clubId && CLUB_NAME_ALIASES[clubId]) return CLUB_NAME_ALIASES[clubId];

  return name
    .replace(/^Football\s+Club\s+Internazionale\s+Milano.*$/i, 'Inter Milan')
    .replace(/^Associazione\s+Calcio\s+Milan.*$/i, 'AC Milan')
    .replace(/^Associazione\s+Sportiva\s+Roma.*$/i, 'Roma')
    .replace(/^Societ[aà]\s+Sportiva\s+Calcio\s+Napoli.*$/i, 'Napoli')
    .replace(/^Societ[aà]\s+Sportiva\s+Lazio.*$/i, 'Lazio')
    .replace(/^Unione\s+Sportiva\s+Cremonese.*$/i, 'Cremonese')
    .replace(/^Atalanta\s+Bergamasca\s+Calcio.*$/i, 'Atalanta')
    .replace(/^Calcio\s+Como.*$/i, 'Como')
    .replace(/^Juventus\s+Football\s+Club.*$/i, 'Juventus')
    .replace(/^Paris\s+Saint-Germain\s+Football\s+Club$/i, 'Paris Saint-Germain')
    .replace(/^Olympique\s+de\s+Marseille$/i, 'Marseille')
    .replace(/^Club\s+Atl[eé]tico\s+de\s+Madrid.*$/i, 'Atletico Madrid')
    .replace(/^Real\s+Madrid\s+Club\s+de\s+F[uú]tbol$/i, 'Real Madrid')
    .replace(/^Fu[sß]ball-Club\s+Bayern\s+M[uü]nchen.*$/i, 'Bayern Munich')
    .replace(/^Bayern\s+M[uü]nchen$/i, 'Bayern Munich')
    .replace(/^Sportverein\s+Werder\s+Bremen\s+von\s+1899$/i, 'Werder Bremen')
    .replace(/^Fu[sß]ballclub\s+Gelsenkirchen-Schalke\s+04.*$/i, 'Schalke 04')
    .replace(/^Ballspielverein\s+Borussia\s+09\s+Dortmund.*$/i, 'Borussia Dortmund')
    .replace(/^Bayer\s+04\s+Leverkusen.*$/i, 'Bayer Leverkusen')
    .replace(/^Verein\s+f[uü]r\s+Bewegungsspiele\s+Stuttgart.*$/i, 'VfB Stuttgart')
    .replace(/^Hamburger\s+Sport-Verein.*$/i, 'Hamburger SV')
    .replace(/^Verein\s+f[uü]r\s+Leibes[uü]bungen\s+Wolfsburg.*$/i, 'VfL Wolfsburg')
    .replace(/^Borussia\s+Verein\s+f[uü]r\s+Leibes[uü]bungen.*M[oö]nchengladbach.*$/i, 'Borussia Monchengladbach')
    .replace(/^Eintracht\s+Frankfurt\s+Fu[sß]ball.*$/i, 'Eintracht Frankfurt')
    .replace(/^RasenBallsport\s+Leipzig.*$/i, 'RB Leipzig')
    .replace(/^1\.\s*Fu[sß]ball-Club\s+K[oö]ln.*$/i, '1. FC Koln')
    .replace(/^Hertha\s+BSC.*$/i, 'Hertha BSC')
    .replace(/^Hannover\s+96.*$/i, 'Hannover 96')
    .replace(/^Fortuna\s+D[uü]sseldorf.*$/i, 'Fortuna Dusseldorf')
    .replace(/^VfL\s+Bochum.*$/i, 'VfL Bochum')
    .replace(/^1\.\s*Fu[sß]ball-\s*und\s*Sportverein\s+Mainz\s+05.*$/i, 'Mainz 05')
    .replace(/^Sport-Club\s+Freiburg.*$/i, 'SC Freiburg')
    .replace(/^Turn-\s*und\s*Sportgemeinschaft\s+1899\s+Hoffenheim.*$/i, 'TSG Hoffenheim')
    .replace(/^Fu[sß]ball-Club\s+Augsburg.*$/i, 'FC Augsburg')
    .replace(/^1\.?FC\s+Nuremberg$/i, '1. FC Nurnberg')
    .replace(/^Fu[sß]ball-Club\s+St\.\s*Pauli.*$/i, 'St. Pauli')
    .replace(/^Aston\s+Villa\s+Football\s+Club$/i, 'Aston Villa')
    .replace(/^Nottingham\s+Forest\s+Football\s+Club$/i, 'Nottingham Forest')
    .replace(/^Southampton\s+FC$/i, 'Southampton')
    .replace(/^Sunderland\s+Association\s+Football\s+Club$/i, 'Sunderland')
    .replace(/^Bologna\s+Football\s+Club.*$/i, 'Bologna')
    .replace(/^Bar[cç]a\s+Atl[eè]tic$/i, 'Barca Atletic')
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
    .replace(/^Associazione\s+Calcio\s+/i, '')
    .replace(/^Unione\s+Sportiva\s+/i, '')
    .replace(/^Societ[aà]\s+Sportiva\s+/i, '')
    .replace(/\s+Calcio$/i, '')
    .replace(/\s+FC$/i, '')
    .replace(/\s+S\.?\s*p\.?\s*A\.?$/i, '')
    .replace(/\s+S\.?\s*A\.?\s*D\.?$/i, '')
    .replace(/\s+a\.?s\.?$/i, '')
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
