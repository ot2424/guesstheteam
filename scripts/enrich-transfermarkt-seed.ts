import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { TransfermarktBackupService } from '../backend/src/services/TransfermarktBackupService';
import type { TeamData } from '../backend/src/types';

interface SeedFile {
  generatedAt?: string;
  source?: Record<string, unknown>;
  teams: TeamData[];
  players?: Array<Record<string, unknown>>;
}

interface Args {
  input: string;
  out: string;
  limit: number;
  concurrency: number;
}

const args = parseArgs(process.argv.slice(2));
const rawSeed = JSON.parse(await readFile(args.input, 'utf8')) as SeedFile;
const backupService = new TransfermarktBackupService();
const teamsToEnrich = args.limit > 0 ? rawSeed.teams.slice(0, args.limit) : rawSeed.teams;
const untouchedTeams = args.limit > 0 ? rawSeed.teams.slice(args.limit) : [];
const enrichedTeams = await mapWithConcurrency(teamsToEnrich, args.concurrency, async (team, index) => {
  const enriched = await backupService.enrichTeamData(team);
  console.log(`[${index + 1}/${teamsToEnrich.length}] ${team.name} -> ${enriched.name}`);
  return enriched;
});

const teams = [...enrichedTeams, ...untouchedTeams];
const enrichedSeed: SeedFile = {
  ...rawSeed,
  generatedAt: rawSeed.generatedAt ?? new Date().toISOString(),
  source: {
    ...rawSeed.source,
    enrichedAt: new Date().toISOString(),
    enrichmentProvider: 'felipeall/transfermarkt-api',
  },
  teams,
  players: buildPlayerPool(teams),
};
const tempPath = `${args.out}.tmp`;

await mkdir(path.dirname(args.out), { recursive: true });
await writeFile(tempPath, `${JSON.stringify(enrichedSeed, null, 2)}\n`);
await rename(tempPath, args.out);

console.log(`Enriched ${enrichedTeams.length} team seasons to ${args.out}`);

function parseArgs(argv: string[]): Args {
  const values = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    values.set(token.slice(2), argv[index + 1] ?? '');
    index += 1;
  }

  return {
    input: values.get('input') ?? 'data/seeds/guesstheteam-seed.json',
    out: values.get('out') ?? values.get('input') ?? 'data/seeds/guesstheteam-seed.json',
    limit: Number(values.get('limit') ?? 0),
    concurrency: Math.max(1, Number(values.get('concurrency') ?? 3)),
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  callback: (item: T, index: number) => Promise<R>,
) {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await callback(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

function buildPlayerPool(teams: TeamData[]) {
  return [...new Map(teams.flatMap((team) => team.players).map((player) => [player.id, {
    id: player.id,
    name: player.name,
    position: player.position,
    nationality: player.nationality,
    nationality2: player.nationality2,
  }])).values()];
}
