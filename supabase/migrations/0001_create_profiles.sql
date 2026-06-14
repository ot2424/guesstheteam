create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
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

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles
  for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

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

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    username,
    first_name,
    last_name,
    email
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    new.email
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists create_profile_on_auth_signup on auth.users;
create trigger create_profile_on_auth_signup
  after insert on auth.users
  for each row
  execute function public.create_profile_for_new_user();

create table if not exists public.match_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
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

alter table public.match_results enable row level security;

create index if not exists match_results_user_created_idx
  on public.match_results (user_id, created_at desc);

create policy "match_results_select_own"
  on public.match_results
  for select
  using (auth.uid() = user_id);

create policy "match_results_insert_own"
  on public.match_results
  for insert
  with check (auth.uid() = user_id);
