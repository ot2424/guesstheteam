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

alter table public.online_matchups enable row level security;
alter table public.online_matchup_results enable row level security;

-- Online matchups are accessed through the backend service role.
-- No direct client policies on purpose.
