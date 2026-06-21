import 'dotenv/config';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import type { Difficulty } from '../backend/src/types';

interface TeamCatalogItem {
  id: number;
  team_name: string;
  season: string;
  season_id: string;
  league: string;
  difficulty: Difficulty;
}

interface Args {
  input: string;
  limit: number;
  offset: number;
  dryRun: boolean;
  continueOnError: boolean;
}

const args = parseArgs(process.argv.slice(2));
const catalog = JSON.parse(await readFile(args.input, 'utf8')) as TeamCatalogItem[];
const selected = catalog
  .sort((a, b) => a.id - b.id)
  .slice(args.offset, args.limit > 0 ? args.offset + args.limit : undefined);

let failed = 0;

for (const item of selected) {
  console.log(`[${item.id}] Building ${item.team_name} ${item.season} (${item.difficulty})`);

  const code = await runBuilder(item, args.dryRun);
  if (code !== 0) {
    failed += 1;
    if (!args.continueOnError) process.exit(code);
  }
}

if (failed > 0) {
  console.log(`Finished with ${failed} failed team builds.`);
  process.exitCode = 1;
} else {
  console.log(`Finished ${selected.length} team builds.`);
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
    input: String(values.get('input') ?? 'data/seeds/team-season-catalog.json'),
    limit: Number(values.get('limit') ?? 0),
    offset: Number(values.get('offset') ?? 0),
    dryRun: values.has('dry-run'),
    continueOnError: values.has('continue-on-error'),
  };
}

function runBuilder(item: TeamCatalogItem, dryRun: boolean) {
  const builderArgs = [
    'tsx',
    'scripts/build-team-season.ts',
    '--club',
    item.team_name,
    '--season',
    item.season_id,
    '--league',
    item.league,
    '--difficulty',
    item.difficulty,
  ];

  if (dryRun) builderArgs.push('--dry-run');

  return new Promise<number>((resolve) => {
    const child = spawn('npx', builderArgs, {
      stdio: 'inherit',
      env: process.env,
    });

    child.on('close', (code) => resolve(code ?? 1));
    child.on('error', () => resolve(1));
  });
}
