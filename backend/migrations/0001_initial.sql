create table public.users (
 id uuid primary key default gen_random_uuid(),
 email text not null unique check (email = lower(email)),
 password_hash text not null,
 email_verified boolean not null default false,
 created_at timestamptz not null default now()
);
create table public.auth_sessions (
 token_hash text primary key,
 user_id uuid not null references public.users(id) on delete cascade,
 expires_at timestamptz not null,
 created_at timestamptz not null default now()
);
create index auth_sessions_expiry_idx on public.auth_sessions(expires_at);
create table if not exists public.profiles (
  id uuid primary key references public.users(id) on delete cascade,
  username text not null unique,
  first_name text not null,
  last_name text not null,
  email text not null unique,
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  lp integer not null default 0 check (lp >= 0),
  rank text not null default 'Bronze 3',
  badges text[] not null default '{}',
  matches_played integer not null default 0 check (matches_played >= 0),
  matches_won integer not null default 0 check (matches_won >= 0),
  win_streak integer not null default 0 check (win_streak >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);









create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();



create table if not exists public.match_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  session_id uuid not null,
  team_id text not null,
  team_name text not null,
  season text not null,
  league text not null,
  play_mode text not null,
  match_type text not null,
  difficulty text not null,
  rank_at_start text not null,
  solved integer not null check (solved >= 0),
  total integer not null check (total > 0),
  duration_sec integer not null check (duration_sec >= 0),
  completion_ratio numeric not null check (completion_ratio >= 0),
  is_win boolean not null,
  is_perfect boolean not null,
  xp_gained integer not null default 0,
  lp_change integer not null default 0,
  created_at timestamptz not null default now()
);



create index if not exists match_results_user_created_idx
  on public.match_results (user_id, created_at desc);





alter table public.profiles
  add column if not exists skip_shields integer not null default 0 check (skip_shields >= 0),
  add column if not exists auto_solve_jokers integer not null default 0 check (auto_solve_jokers >= 0);

create table if not exists public.active_game_sessions (
  id uuid primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  session jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);



create index if not exists active_game_sessions_user_updated_idx
  on public.active_game_sessions (user_id, updated_at desc);

drop trigger if exists active_game_sessions_set_updated_at on public.active_game_sessions;
create trigger active_game_sessions_set_updated_at
  before update on public.active_game_sessions
  for each row
  execute function public.set_updated_at();




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



create index if not exists team_seasons_difficulty_league_idx
  on public.team_seasons (difficulty, league);

create index if not exists team_seasons_season_idx
  on public.team_seasons (season);

drop trigger if exists team_seasons_set_updated_at on public.team_seasons;
create trigger team_seasons_set_updated_at
  before update on public.team_seasons
  for each row
  execute function public.set_updated_at();




alter table public.profiles
  add column if not exists best_win_streak integer not null default 0 check (best_win_streak >= 0);

update public.profiles
set best_win_streak = greatest(best_win_streak, win_streak)
where best_win_streak < win_streak;

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friend_requests_not_self check (requester_id <> addressee_id)
);

create unique index if not exists friend_requests_pair_unique_idx
  on public.friend_requests (
    least(requester_id, addressee_id),
    greatest(requester_id, addressee_id)
  );

create index if not exists friend_requests_addressee_status_idx
  on public.friend_requests (addressee_id, status, created_at desc);

create index if not exists friend_requests_requester_status_idx
  on public.friend_requests (requester_id, status, created_at desc);






create table if not exists public.online_matchups (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references public.profiles(id) on delete cascade,
  opponent_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active', 'completed', 'expired')),
  team jsonb not null,
  challenger_state jsonb not null,
  opponent_state jsonb,
  challenger_joined_at timestamptz not null default now(),
  opponent_joined_at timestamptz,
  challenger_left_at timestamptz,
  opponent_left_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '45 minutes'),
  winner_id uuid references public.profiles(id) on delete set null,
  win_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint online_matchups_not_self check (challenger_id <> opponent_id)
);

create index if not exists online_matchups_challenger_idx
  on public.online_matchups (challenger_id, status, updated_at desc);

create index if not exists online_matchups_opponent_idx
  on public.online_matchups (opponent_id, status, updated_at desc);

create table if not exists public.online_matchup_results (
  id uuid primary key default gen_random_uuid(),
  matchup_id uuid not null references public.online_matchups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  opponent_id uuid not null references public.profiles(id) on delete cascade,
  solved integer not null default 0 check (solved >= 0),
  total integer not null default 11 check (total > 0),
  duration_sec integer not null default 0 check (duration_sec >= 0),
  is_winner boolean not null default false,
  outcome text not null check (outcome in ('win', 'loss', 'draw')),
  win_reason text,
  created_at timestamptz not null default now(),
  unique (matchup_id, user_id)
);

create index if not exists online_matchup_results_pair_idx
  on public.online_matchup_results (user_id, opponent_id, created_at desc);







create unique index match_results_session_unique on public.match_results(user_id, session_id);
create unique index profiles_username_case_unique on public.profiles(lower(username));
