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

alter table public.friend_requests enable row level security;

-- Friend requests are accessed through the backend service role.
-- No direct client policies on purpose.
