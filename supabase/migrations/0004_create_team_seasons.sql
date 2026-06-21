create table if not exists public.team_seasons (
  id text primary key,
  club_id text,
  source_game_id text,
  name text not null,
  season text not null,
  league text not null,
  logo_url text not null default '',
  formation text not null default '4-3-3',
  difficulty text not null default 'easy',
  provider text not null default 'seed',
  team jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.team_seasons enable row level security;

create index if not exists team_seasons_difficulty_league_idx
  on public.team_seasons (difficulty, league);

create index if not exists team_seasons_season_idx
  on public.team_seasons (season);

drop trigger if exists team_seasons_set_updated_at on public.team_seasons;
create trigger team_seasons_set_updated_at
  before update on public.team_seasons
  for each row
  execute function public.set_updated_at();

-- No client policies: team jsonb contains player names.
-- Access goes through backend/scripts with SUPABASE_SERVICE_ROLE_KEY only.
