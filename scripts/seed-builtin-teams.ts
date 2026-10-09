import { REAL_MADRID_2223 } from '../backend/src/data/mockTeams';
import { WORLD_CUP_TEAMS } from '../backend/src/data/worldCupTeams';
import { pool, upsertRows } from '../backend/src/db/pool';
try {
  const teams = [REAL_MADRID_2223, ...WORLD_CUP_TEAMS];
  const rows = teams.map(team => ({ id: team.id, name: team.name, season: team.season, league: team.league,
    logo_url: team.logoUrl ?? '', formation: team.formation, difficulty: team.id === REAL_MADRID_2223.id ? 'easy' : 'medium',
    provider: 'builtin-seed', team: { ...team, difficulty: team.id === REAL_MADRID_2223.id ? 'easy' : 'medium' } }));
  await upsertRows('team_seasons', rows);
  console.log(`Stored ${rows.length} built-in team seasons.`);
} finally { await pool.end(); }
