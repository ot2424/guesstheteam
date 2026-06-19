# GuessTheTeam Deployment

## Zielbild

- Frontend: Vercel, Netlify oder ein anderer Static-Host.
- Backend: Render, Railway, Fly.io oder ein Node-Server.
- Datenbank/Auth: Supabase.
- Domain: `guesstheteam.de`.

## 1. Supabase vorbereiten

1. Migration ausführen: `supabase/migrations/0001_create_profiles.sql`
2. In Supabase Auth die Site URL später auf `https://guesstheteam.de` setzen.
3. Redirect URLs ergänzen:
   - `http://localhost:5173`
   - `https://guesstheteam.de`
   - falls Frontend zunächst auf Vercel/Netlify läuft: diese Preview-/Production-URL ebenfalls.

## 2. Lokale ENV

Kopiere `.env.example` zu `.env` und setze:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL=http://localhost:4000/api/v1`
- `CORS_ORIGIN=http://localhost:5173`

Danach lokal prüfen:

```bash
npm run backend:dev
npm run dev
```

## 3. Backend zuerst deployen

Empfohlene ENV für Backend:

- `NODE_ENV=production`
- `PORT=4000`
- `CORS_ORIGIN=https://guesstheteam.de`
- `SUPABASE_URL=https://YOUR_PROJECT.supabase.co`
- `SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY`
- `TRANSFERMARKT_BACKUP_ENABLED=false`

Nach dem Deploy muss `/health` erreichbar sein.

## 4. Frontend danach deployen

Empfohlene ENV für Frontend:

- `VITE_API_BASE_URL=https://DEINE_BACKEND_DOMAIN/api/v1`
- `VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co`
- `VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY`

Build-Befehl:

```bash
npm run build
```

Output-Verzeichnis:

```text
dist
```

## 5. Domain zuletzt verbinden

1. Erst Backend und Frontend über ihre Provider-URLs testen.
2. Dann `guesstheteam.de` auf das Frontend zeigen lassen.
3. Backend entweder unter eigener Subdomain betreiben, z. B. `api.guesstheteam.de`, oder die Provider-URL im Frontend lassen.
4. Danach `CORS_ORIGIN` im Backend auf die echte Frontend-Domain setzen.
