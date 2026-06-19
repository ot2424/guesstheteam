create table if not exists public.active_game_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  session jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.active_game_sessions enable row level security;

create index if not exists active_game_sessions_user_updated_idx
  on public.active_game_sessions (user_id, updated_at desc);

drop trigger if exists active_game_sessions_set_updated_at on public.active_game_sessions;
create trigger active_game_sessions_set_updated_at
  before update on public.active_game_sessions
  for each row
  execute function public.set_updated_at();

-- Keine Client-Policies: aktive Sessions enthalten die gesuchten Spielernamen.
-- Zugriff erfolgt ausschließlich über das Backend mit SUPABASE_SERVICE_ROLE_KEY.
