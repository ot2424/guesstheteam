import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { TransfermarktBackupService } from '../backend/src/services/TransfermarktBackupService';
import type { TeamData } from '../backend/src/types';

interface Args {
  dryRun: boolean;
  write: boolean;
  force: boolean;
  limit: number;
  offset: number;
  filter?: string;
  teamId?: string;
}

interface TeamSeasonRow {
  id: string;
  name: string;
  season: string;
  team: TeamData;
}

const args = parseArgs(process.argv.slice(2));
if (!args.dryRun && !args.write) {
  throw new Error('Refusing to write without --write. Use --dry-run to preview or --write to update Supabase.');
}
const supabase = createSupabaseClient();
const transfermarkt = new TransfermarktBackupService();
const rows = await readTeamRows(args);

let changedTeams = 0;
let changedPlayers = 0;

for (let index = 0; index < rows.length; index += 1) {
  const row = rows[index];
  const before = row.team;
  const after = await transfermarkt.enrichTeamData(before, { force: args.force });
  const playerChanges = countChangedPlayers(before, after);

  if (playerChanges === 0) {
    console.log(`[${index + 1}/${rows.length}] ${row.name} ${row.season}: unchanged`);
    continue;
  }

  changedTeams += 1;
  changedPlayers += playerChanges;
  console.log(`[${index + 1}/${rows.length}] ${row.name} ${row.season}: ${playerChanges} player careers updated`);

  if (args.dryRun) {
    printCareerDiff(before, after);
    continue;
  }

  const { error } = await supabase
    .from('team_seasons')
    .update({
      name: after.name,
      logo_url: after.logoUrl ?? '',
      team: after,
    })
    .eq('id', row.id);

  if (error) throw new Error(`Supabase update failed for ${row.id}: ${error.message}`);
}

console.log(
  `${args.dryRun ? 'Dry run complete' : 'Enrichment complete'}: ${changedTeams}/${rows.length} teams, ${changedPlayers} player careers changed.`,
);

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
    dryRun: values.has('dry-run'),
    write: values.has('write'),
    force: values.has('force'),
    limit: Number(values.get('limit') ?? 0),
    offset: Number(values.get('offset') ?? 0),
    filter: typeof values.get('filter') === 'string' ? String(values.get('filter')) : undefined,
    teamId: typeof values.get('team-id') === 'string' ? String(values.get('team-id')) : undefined,
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

async function readTeamRows(options: Args) {
  const pageSize = options.filter || options.teamId ? 1000 : options.limit > 0 ? Math.min(options.limit, 1000) : 1000;
  const rows: TeamSeasonRow[] = [];
  let from = options.offset;

  while (true) {
    let query = supabase
      .from('team_seasons')
      .select('id, name, season, team')
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);

    if (options.teamId) query = query.eq('id', options.teamId);

    const { data, error } = await query.returns<TeamSeasonRow[]>();
    if (error) throw new Error(`Supabase read failed: ${error.message}`);

    const page = (data ?? []).filter((row) => matchesFilter(row, options.filter));
    rows.push(...page);

    if (options.teamId || (!options.filter && options.limit > 0) || !data || data.length < pageSize) break;
    if (options.filter && options.limit > 0 && rows.length >= options.limit) break;
    from += pageSize;
  }

  return options.limit > 0 ? rows.slice(0, options.limit) : rows;
}

function matchesFilter(row: TeamSeasonRow, filter: string | undefined) {
  if (!filter) return true;
  const normalizedFilter = normalize(filter);
  return normalize(`${row.id} ${row.name} ${row.season}`).includes(normalizedFilter);
}

function countChangedPlayers(before: TeamData, after: TeamData) {
  const beforePlayers = new Map(before.players.map((player) => [player.id, JSON.stringify(player.career)]));
  return after.players.filter((player) => beforePlayers.get(player.id) !== JSON.stringify(player.career)).length;
}

function printCareerDiff(before: TeamData, after: TeamData) {
  const beforePlayers = new Map(before.players.map((player) => [player.id, player]));

  for (const player of after.players) {
    const previous = beforePlayers.get(player.id);
    if (!previous || JSON.stringify(previous.career) === JSON.stringify(player.career)) continue;

    console.log(`  - ${player.name}`);
    console.log(`    before: ${formatCareer(previous.career)}`);
    console.log(`    after:  ${formatCareer(player.career)}`);
  }
}

function formatCareer(career: TeamData['players'][number]['career']) {
  return career
    .map((club) => `${club.clubName} ${club.fromYear}-${club.toYear ?? 'heute'}${club.logoUrl ? '' : ' (no logo)'}`)
    .join(' | ');
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
}
