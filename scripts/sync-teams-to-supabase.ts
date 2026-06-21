import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { TransfermarktBackupService } from '../backend/src/services/TransfermarktBackupService';
import type { Difficulty, Position, TeamData } from '../backend/src/types';

interface SeedFile {
  teams: SeedTeam[];
}

type SeedTeam = TeamData & {
  difficulty?: Difficulty;
  clubId?: string;
  sourceGameId?: string;
};

interface Args {
  input: string;
  limit: number;
  dryRun: boolean;
  useOpenAi: boolean;
  enrichTransfermarkt: boolean;
  provider: string;
}

interface OpenAiTeamPatch {
  name?: string;
  league?: string;
  formation?: string;
  players?: Array<{
    id: string;
    position?: Position;
    formationSlot?: number;
  }>;
}

const POSITION_VALUES = new Set<Position>(['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF']);

const args = parseArgs(process.argv.slice(2));
const rawSeed = JSON.parse(await readFile(args.input, 'utf8')) as SeedFile;
const transfermarkt = args.enrichTransfermarkt ? new TransfermarktBackupService() : null;
const teams = args.limit > 0 ? rawSeed.teams.slice(0, args.limit) : rawSeed.teams;
const rows: ReturnType<typeof toTeamSeasonRow>[] = [];

for (let index = 0; index < teams.length; index += 1) {
  const seedTeam = teams[index];
  const enriched = transfermarkt ? await transfermarkt.enrichTeamData(seedTeam) : seedTeam;
  const normalized = args.useOpenAi ? await normalizeWithOpenAi(enriched) : enriched;
  rows.push(toTeamSeasonRow(normalized, seedTeam, args.provider));
  console.log(`[${index + 1}/${teams.length}] ${normalized.name} ${normalized.season} -> ${normalized.formation}`);
}

if (args.dryRun) {
  console.log(`Dry run: prepared ${rows.length} team seasons.`);
} else {
  const supabase = createSupabaseClient();

  for (const batch of chunk(rows, 50)) {
    const { error } = await supabase
      .from('team_seasons')
      .upsert(batch, { onConflict: 'id' });

    if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
  }

  console.log(`Synced ${rows.length} team seasons to Supabase.`);
}

function parseArgs(argv: string[]): Args {
  const values = new Map<string, string | boolean>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      values.set(key, true);
    } else {
      values.set(key, next);
      index += 1;
    }
  }

  return {
    input: String(values.get('input') ?? 'data/seeds/guesstheteam-seed.json'),
    limit: Number(values.get('limit') ?? 0),
    dryRun: values.has('dry-run'),
    useOpenAi: values.has('openai'),
    enrichTransfermarkt: values.has('enrich-transfermarkt'),
    provider: String(values.get('provider') ?? 'seed-openai-sync'),
  };
}

function createSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  }

  return createClient(url, serviceRoleKey);
}

function toTeamSeasonRow(team: TeamData, seedTeam: SeedTeam, provider: string) {
  const payload = {
    ...team,
    players: team.players.map((player, index) => ({
      ...player,
      formationSlot: Number.isInteger(player.formationSlot) ? player.formationSlot : index,
      career: player.career.map((club) => ({
        ...club,
        logoUrl: club.logoUrl ?? '',
      })),
    })),
  };

  return {
    id: team.id,
    club_id: seedTeam.clubId ?? null,
    source_game_id: seedTeam.sourceGameId ?? null,
    name: team.name,
    season: team.season,
    league: team.league,
    logo_url: team.logoUrl ?? '',
    formation: team.formation || inferFormation(team),
    difficulty: seedTeam.difficulty ?? getDifficulty(team.season),
    provider,
    team: payload,
  };
}

async function normalizeWithOpenAi(team: TeamData): Promise<TeamData> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return team;

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? 'gpt-4.1-mini',
      input: [
        {
          role: 'system',
          content: 'You normalize football lineup data for a guessing game. Do not invent player names. Return only the requested JSON patch.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            task: 'Infer the most plausible formation and normalize starter positions for these 11 starters. Keep ids stable. Use only these position values: GK, CB, LB, RB, CDM, CM, CAM, LM, RM, LW, RW, ST, CF.',
            team: {
              id: team.id,
              name: team.name,
              season: team.season,
              league: team.league,
              formation: team.formation,
              players: team.players.map((player) => ({
                id: player.id,
                name: player.name,
                position: player.position,
                formationSlot: player.formationSlot,
                nationality: player.nationality,
              })),
            },
          }),
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'team_lineup_patch',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              name: { type: 'string' },
              league: { type: 'string' },
              formation: { type: 'string' },
              players: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    id: { type: 'string' },
                    position: { type: 'string', enum: [...POSITION_VALUES] },
                    formationSlot: { type: 'integer', minimum: 0, maximum: 10 },
                  },
                  required: ['id', 'position', 'formationSlot'],
                },
              },
            },
            required: ['name', 'league', 'formation', 'players'],
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`OpenAI normalization failed (${response.status}): ${text}`);
  }

  const body = await response.json() as Record<string, unknown>;
  const patch = parseOpenAiPatch(body);
  return applyPatch(team, patch);
}

function parseOpenAiPatch(body: Record<string, unknown>): OpenAiTeamPatch {
  if (typeof body.output_text === 'string') return JSON.parse(body.output_text) as OpenAiTeamPatch;

  const output = Array.isArray(body.output) ? body.output : [];
  for (const item of output) {
    if (!item || typeof item !== 'object') continue;
    const content = Array.isArray((item as { content?: unknown }).content)
      ? (item as { content: unknown[] }).content
      : [];
    for (const contentItem of content) {
      if (!contentItem || typeof contentItem !== 'object') continue;
      const text = (contentItem as { text?: unknown }).text;
      if (typeof text === 'string') return JSON.parse(text) as OpenAiTeamPatch;
    }
  }

  throw new Error('OpenAI response did not contain parseable JSON.');
}

function applyPatch(team: TeamData, patch: OpenAiTeamPatch): TeamData {
  const playerPatchById = new Map((patch.players ?? []).map((player) => [player.id, player]));

  return {
    ...team,
    name: patch.name?.trim() || team.name,
    league: patch.league?.trim() || team.league,
    formation: patch.formation?.trim() || team.formation || inferFormation(team),
    players: team.players.map((player, index) => {
      const patchPlayer = playerPatchById.get(player.id);
      const position = patchPlayer?.position && POSITION_VALUES.has(patchPlayer.position)
        ? patchPlayer.position
        : player.position;
      const formationSlot = Number.isInteger(patchPlayer?.formationSlot)
        ? patchPlayer.formationSlot as number
        : index;

      return {
        ...player,
        position,
        formationSlot,
      };
    }),
  };
}

function inferFormation(team: TeamData) {
  const defenders = team.players.filter((player) => ['CB', 'LB', 'RB'].includes(player.position)).length || 4;
  const attackers = team.players.filter((player) => ['LW', 'RW', 'ST', 'CF'].includes(player.position)).length || 3;
  const midfielders = Math.max(1, 10 - defenders - attackers);
  return `${defenders}-${midfielders}-${attackers}`;
}

function getDifficulty(season: string): Difficulty {
  const year = Number(season.slice(0, 4));
  if (year >= 2018) return 'easy';
  if (year >= 2010) return 'medium';
  return 'hard';
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}
