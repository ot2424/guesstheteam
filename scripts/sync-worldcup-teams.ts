import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { WORLD_CUP_TEAMS } from '../backend/src/data/worldCupTeams';
import type { TeamData } from '../backend/src/types';

const args = parseArgs(process.argv.slice(2));
const rows = WORLD_CUP_TEAMS.map(toTeamSeasonRow);

if (args.dryRun) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  const supabase = createSupabaseClient();

  for (const batch of chunk(rows, 50)) {
    const { error } = await supabase
      .from('team_seasons')
      .upsert(batch, { onConflict: 'id' });

    if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
  }

  console.log(`Synced ${rows.length} World Cup national teams to Supabase.`);
}

function parseArgs(argv: string[]) {
  return {
    dryRun: argv.includes('--dry-run'),
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
