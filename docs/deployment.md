# GuessTheTeam Deployment Notes

GuessTheTeam uses two separate runtime targets:

- Frontend: Vite/React app
- Game API: Express backend
- Supabase: Auth, profiles, match history

## Local URLs

Use these values while developing locally:

```env
VITE_API_BASE_URL=http://localhost:4000/api/v1
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY

PORT=4000
CORS_ORIGIN=http://localhost:5173
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

`VITE_API_BASE_URL` must point to the Game API, not to Supabase REST.

## Production URLs

Production with the domain `guesstheteam.de`:

```env
VITE_API_BASE_URL=https://api.guesstheteam.de/api/v1
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY

PORT=4000
CORS_ORIGIN=https://guesstheteam.de
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR_ANON_KEY
NODE_ENV=production
```

## Supabase Setup

Run the SQL in:

```text
supabase/migrations/0001_create_profiles.sql
```

This creates:

- `profiles`
- `match_results`
- Row Level Security policies for own-profile and own-match access
- A signup trigger that creates a profile row

## Supabase Auth Redirects

In Supabase Dashboard:

- Authentication
- URL Configuration

Set:

- Site URL: `https://guesstheteam.de`
- Redirect URLs:
  - `https://guesstheteam.de/*`
  - `http://localhost:5173/*`

## Deployment Order

1. Run Supabase migration.
2. Deploy backend API.
3. Set backend env vars.
4. Deploy frontend.
5. Set frontend env vars.
6. Point domain DNS to the frontend host.
7. Point `api.guesstheteam.de` DNS to the backend host.
8. Update Supabase Auth URLs.
