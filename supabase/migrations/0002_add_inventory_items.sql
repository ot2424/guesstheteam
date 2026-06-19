alter table public.profiles
  add column if not exists skip_shields integer not null default 0 check (skip_shields >= 0),
  add column if not exists auto_solve_jokers integer not null default 0 check (auto_solve_jokers >= 0);
