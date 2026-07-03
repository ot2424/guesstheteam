# GuessTheTeam Deployment

Ziel:

- Frontend: `https://guesstheteam.de`
- Backend/API: `https://api.guesstheteam.de`
- Auth + Datenbank: Supabase

## 1. Vor dem Deploy prüfen

Lokal einmal ausführen:

```bash
npm test
npm run lint
npm run build
```

Supabase muss diese Migrationen enthalten:

```text
supabase/migrations/0001_create_profiles.sql
supabase/migrations/0002_add_inventory_items.sql
supabase/migrations/0003_create_active_game_sessions.sql
supabase/migrations/0004_create_team_seasons.sql
```

Die Teamdaten sollten in `public.team_seasons` importiert sein.

## 2. Backend auf Render deployen

Empfohlen: Render Blueprint aus `render.yaml`.

1. Render öffnen und das GitHub-Repo verbinden.
2. `render.yaml` als Blueprint verwenden.
3. Service-Name: `guesstheteam-api`.
4. Diese Environment Variables setzen:

```text
NODE_ENV=production
CORS_ORIGIN=https://guesstheteam.de,https://www.guesstheteam.de
GUESSTHETEAM_TEAM_SOURCE=supabase
TRANSFERMARKT_BACKUP_ENABLED=false
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
```

Render setzt `PORT` selbst. Nicht hart überschreiben, außer Render verlangt es.

Nach dem Deploy prüfen:

```text
https://DEIN-RENDER-SERVICE.onrender.com/health
```

Danach in Render die Custom Domain verbinden:

```text
api.guesstheteam.de
```

Render zeigt dir anschließend den DNS-Record, meistens ein `CNAME`.

## 3. Frontend auf Vercel deployen

1. Vercel öffnen und das GitHub-Repo importieren.
2. Framework: Vite.
3. Build Command:

```bash
npm run build
```

4. Output Directory:

```text
dist
```

5. Environment Variables setzen:

```text
VITE_API_BASE_URL=https://api.guesstheteam.de/api/v1
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY
```

Nach dem Deploy die Domain verbinden:

```text
guesstheteam.de
www.guesstheteam.de
```

Vercel zeigt dir die nötigen DNS-Records.

## 4. DNS bei deinem Domain-Anbieter

Typische Zielstruktur:

```text
guesstheteam.de      -> Vercel
www.guesstheteam.de  -> Vercel
api.guesstheteam.de  -> Render
```

Die exakten `A`/`CNAME` Werte immer von Vercel und Render übernehmen, weil sie pro Projekt/Account unterschiedlich sein können.

## 5. Supabase Auth URLs

In Supabase unter Authentication -> URL Configuration setzen:

```text
Site URL:
https://guesstheteam.de
```

Redirect URLs:

```text
http://localhost:5173
https://guesstheteam.de
https://www.guesstheteam.de
```

Falls Vercel Preview Deploys genutzt werden, zusätzlich die Vercel Preview URL erlauben.

## 6. Production Smoke Test

Nach DNS/SSL:

1. `https://api.guesstheteam.de/health` muss `{ "ok": true }` liefern.
2. `https://guesstheteam.de` öffnen.
3. Registrieren oder einloggen.
4. Freizeit-Spiel starten.
5. Ranked nur testen, wenn Profil Level 5 hat.
6. Browser DevTools prüfen: keine 401/CORS Fehler.

## 7. Wenn CORS fehlschlägt

Backend-ENV prüfen:

```text
CORS_ORIGIN=https://guesstheteam.de,https://www.guesstheteam.de
```

Wenn du später nur eine Domain-Variante nutzt, kannst du die andere aus `CORS_ORIGIN` entfernen.
