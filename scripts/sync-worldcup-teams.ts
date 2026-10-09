import 'dotenv/config';
import { pool, upsertRows } from '../backend/src/db/pool';
import { WORLD_CUP_TEAMS } from '../backend/src/data/worldCupTeams';
import type { TeamData } from '../backend/src/types';

try {

const args = parseArgs(process.argv.slice(2));
const rows = WORLD_CUP_TEAMS.map(toTeamSeasonRow);

if (args.dryRun) {
  console.log(JSON.stringify(rows, null, 2));
} else {


  for (const batch of chunk(rows, 50)) {
    await upsertRows('team_seasons', batch);
  }

  console.log(`Synced ${rows.length} World Cup national teams to PostgreSQL.`);
}

function parseArgs(argv: string[]) {
  return {
    dryRun: argv.includes('--dry-run'),
  };
}


function toTeamSeasonRow(team: TeamData) {
  return {
    id: team.id,
    club_id: null,
    source_game_id: null,
    name: team.name,
    season: team.season,
    league: team.league,
    logo_url: team.logoUrl,
    formation: team.formation,
    difficulty: 'medium',
    provider: 'worldcup-national-seed',
    team,
  };
}

function chunk<T>(items: T[], size: number) {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

} finally { await pool.end(); }
