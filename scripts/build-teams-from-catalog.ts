import 'dotenv/config';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
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
  concurrency: number;
  failedOut: string;
  retryAttempts: number;
  retryFailed: boolean;
}

type FailedBuild = TeamCatalogItem & {
  exitCode: number;
  attempts: number;
};

const args = parseArgs(process.argv.slice(2));
const catalog = JSON.parse(await readFile(args.input, 'utf8')) as TeamCatalogItem[];
const selected = args.retryFailed
  ? await readFailedBuilds(args.failedOut)
  : catalog
    .sort((a, b) => a.id - b.id)
    .slice(args.offset, args.limit > 0 ? args.offset + args.limit : undefined);

let failures = await runPass(selected, 1);

for (let attempt = 2; attempt <= args.retryAttempts + 1 && failures.length > 0; attempt += 1) {
  console.log(`Retrying ${failures.length} failed team builds (attempt ${attempt}/${args.retryAttempts + 1}).`);
  failures = await runPass(failures, attempt);
}

await writeFailures(args.failedOut, failures);

if (failures.length > 0) {
  console.log(`Finished with ${failures.length} failed team builds. Wrote ${args.failedOut}.`);
  process.exitCode = 1;
} else {
  console.log(`Finished ${selected.length} team builds. No failures.`);
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
    concurrency: Math.max(1, Number(values.get('concurrency') ?? 1)),
    failedOut: String(values.get('failed-out') ?? 'data/import-failures/catalog-build-failures.json'),
    retryAttempts: Math.max(0, Number(values.get('retry-attempts') ?? 0)),
    retryFailed: values.has('retry-failed'),
  };
}

async function readFailedBuilds(failedOut: string): Promise<TeamCatalogItem[]> {
  const failures = JSON.parse(await readFile(failedOut, 'utf8')) as FailedBuild[];
  return failures.sort((a, b) => a.id - b.id);
}

async function runPass(items: TeamCatalogItem[], attempt: number) {
  const failures: FailedBuild[] = [];
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const item = items[cursor];
      cursor += 1;

      console.log(`[${item.id}] Building ${item.team_name} ${item.season} (${item.difficulty}) attempt ${attempt}`);
      const code = await runBuilder(item, args.dryRun);

      if (code !== 0) {
        failures.push({ ...item, exitCode: code, attempts: attempt });
        if (!args.continueOnError) process.exit(code);
      }
    }
  }

  const workerCount = Math.min(args.concurrency, Math.max(1, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return failures.sort((a, b) => a.id - b.id);
}

async function writeFailures(failedOut: string, failures: FailedBuild[]) {
  await mkdir(path.dirname(failedOut), { recursive: true });
  await writeFile(failedOut, `${JSON.stringify(failures, null, 2)}\n`);
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
