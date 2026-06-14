# GuessTheTeam – Backend & Infrastruktur Spezifikation für Codex

> **Scope dieses Dokuments:** Alles außerhalb des React-Frontends – Backend-Server, Datenbank-Schema, Auth, Caching, API-Integration und Deployment.

---

## 1. Übersicht & Technologie-Entscheidungen

| Bereich     | Technologie                     | Begründung                                              |
|-------------|---------------------------------|---------------------------------------------------------|
| Backend     | Node.js + Express + TypeScript  | Konsistenz mit Frontend-TS                              |
| Datenbank   | PostgreSQL via **Supabase**     | Managed, Auth inklusive, RLS, Realtime                  |
| Caching     | Redis (Upstash / Render)        | Game-Sessions, API-Response-Cache, Rate-Limiting        |
| Fußball-API | **API-Football** (rapidapi.com) | Kader, Saisons, Spieler-Transfers, Wappen-URLs          |
| Auth        | Supabase Auth                   | JWT, E-Mail/Passwort + OAuth (Google, GitHub)           |
| Deployment  | Railway oder Render             | Docker-fähig, ENV-Vars, kostenloser Tier vorhanden      |

---

## 2. Kritische Sicherheitsregeln (NIEMALS verletzen)

### 2.1 Spielernamen im Response
> **Spielernamen dürfen NIEMALS im HTTP-Response an das Frontend erscheinen.**

- Das Frontend erhält nur `playerId` (UUID), Nationalität, Position, Karrieredaten.
- Namen werden **ausschließlich** in der Redis-Session gespeichert und **server-side** verglichen.
- `/game/guess` gibt nur `{ correct: boolean, name?: string }` zurück. `name` nur wenn `correct: true`.

### 2.2 Anti-Spoiler Autocomplete
> **Das Autocomplete-Dropdown darf NIEMALS Verein, Liga oder sonstige Hinweise auf das gesuchte Team anzeigen.**

- `/players/search` gibt **nur den vollständigen Namen** zurück – kein `clubId`, kein `leagueId`, kein `teamId`, keine Transferdaten.
- Die Autocomplete-Liste greift auf einen großen **globalen Spieler-Pool** zu, der unabhängig vom aktuellen Spiel ist.

---

## 3. Projektstruktur

```
backend/
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── config/
│   │   ├── env.ts              # Validierte ENV-Variablen (zod)
│   │   └── redis.ts
│   ├── middleware/
│   │   ├── auth.ts             # JWT-Validierung via Supabase
│   │   ├── rateLimit.ts
│   │   └── errorHandler.ts
│   ├── routes/
│   │   ├── game.ts             # /api/game/*
│   │   ├── player.ts           # /api/player/*
│   │   └── user.ts             # /api/user/*
│   ├── services/
│   │   ├── GameSessionService.ts
│   │   ├── ProgressionService.ts
│   │   ├── FootballApiService.ts
│   │   ├── PlayerMatchService.ts   # Fuzzy-Matching, Normalisierung
│   │   └── AchievementService.ts
│   ├── db/
│   │   ├── supabase.ts
│   │   └── queries/
│   └── types/index.ts
├── migrations/
├── .env.example
├── Dockerfile
└── package.json
```

---

## 4. Datenbank-Schema (PostgreSQL / Supabase)

```sql
-- Migration 001: profiles
CREATE TABLE public.profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username       TEXT UNIQUE NOT NULL,
  avatar_url     TEXT,
  xp             INTEGER NOT NULL DEFAULT 0,
  level          INTEGER NOT NULL DEFAULT 1,
  lp             INTEGER NOT NULL DEFAULT 0,
  rank           TEXT NOT NULL DEFAULT 'Bronze 3',
  win_streak     INTEGER NOT NULL DEFAULT 0,
  matches_played INTEGER NOT NULL DEFAULT 0,
  matches_won    INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public readable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Own update"      ON public.profiles FOR UPDATE USING (auth.uid() = id);
```

```sql
-- Migration 002: match_history
CREATE TABLE public.match_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mode         TEXT NOT NULL CHECK (mode IN ('tutorial', 'single', 'series')),
  difficulty   TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  team_api_id  TEXT NOT NULL,
  team_name    TEXT NOT NULL,
  team_logo    TEXT,
  season       TEXT NOT NULL,
  score        INTEGER NOT NULL DEFAULT 0,
  total        INTEGER NOT NULL DEFAULT 11,
  duration_sec INTEGER,
  is_win       BOOLEAN NOT NULL DEFAULT false,
  xp_gained    INTEGER NOT NULL DEFAULT 0,
  lp_change    INTEGER NOT NULL DEFAULT 0,
  played_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.match_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own history" ON public.match_history FOR ALL USING (auth.uid() = user_id);
```

```sql
-- Migration 003: match_guesses
CREATE TABLE public.match_guesses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id      UUID NOT NULL REFERENCES public.match_history(id) ON DELETE CASCADE,
  player_api_id TEXT NOT NULL,
  guessed_input TEXT,
  resolved_name TEXT,
  is_correct    BOOLEAN NOT NULL DEFAULT false,
  wrong_attempts INTEGER NOT NULL DEFAULT 0
);
```

```sql
-- Migration 004: achievements + user_achievements
CREATE TABLE public.achievements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             TEXT UNIQUE NOT NULL,
  name             TEXT NOT NULL,
  description      TEXT NOT NULL,
  icon             TEXT NOT NULL,
  condition_type   TEXT NOT NULL,
  condition_value  INTEGER NOT NULL
);

CREATE TABLE public.user_achievements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id),
  unlocked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, achievement_id)
);
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);

INSERT INTO public.achievements (slug, name, description, icon, condition_type, condition_value) VALUES
  ('first_win',    'Erster Sieg',     'Erstes Match gewonnen',              '🏆', 'win_count',       1),
  ('speed_demon',  'Blitzrater',      'Team in unter 60 Sekunden gelöst',   '⚡', 'speed_under_sec', 60),
  ('hat_trick',    'Hat-Trick',       '3 Matches in Folge gewonnen',        '🎩', 'win_streak',      3),
  ('iron_will',    'Eiserner Wille',  '10 Matches gespielt',                '💪', 'match_count',     10),
  ('eagle_eye',    'Adlerauge',       '5× alle 11 Spieler erraten',         '🦅', 'perfect_count',   5),
  ('globetrotter', 'Weltenbummler',   'Teams aus 5 verschiedenen Ligen',    '🌍', 'league_variety',  5);
```

```sql
-- Migration 005: cosmetics
CREATE TABLE public.cosmetics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL CHECK (type IN ('avatar','banner','title','card_skin')),
  name        TEXT NOT NULL,
  preview_url TEXT,
  xp_required INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE public.user_cosmetics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cosmetic_id UUID NOT NULL REFERENCES public.cosmetics(id),
  is_active   BOOLEAN NOT NULL DEFAULT false,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, cosmetic_id)
);
ALTER TABLE public.user_cosmetics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own cosmetics" ON public.user_cosmetics FOR ALL USING (auth.uid() = user_id);
```

---

## 5. API-Endpunkte

**Basis-URL:** `/api/v1`  
Alle Endpunkte außer `/players/search` erfordern `Authorization: Bearer <supabase-jwt>`.

---

### 5.1 `POST /game/start`

Startet Match, wählt Team nach Difficulty, speichert Session in Redis.

**Request:**
```json
{ "mode": "single", "difficulty": "easy" }
```

**Response:**
```json
{
  "sessionId": "uuid",
  "team": {
    "id": "rm-2223",
    "name": "Real Madrid",
    "season": "2022/23",
    "league": "La Liga",
    "logoUrl": "https://...",
    "formation": "4-3-3",
    "players": [
      {
        "id": "p1",
        "position": "GK",
        "nationality": "Belgium",
        "nationalityFlag": "🇧🇪",
        "formationSlot": 0,
        "career": [
          { "clubId": "chelsea", "clubName": "Chelsea", "logoUrl": "https://...", "fromYear": 2014, "toYear": 2018 }
        ]
      }
    ]
  }
}
```

**`players[].name` ist NIEMALS im Response.**

Redis-Key: `session:{sessionId}` →
```json
{
  "userId": "...", "mode": "single", "difficulty": "easy",
  "startedAt": 1700000000000,
  "players": { "p1": "Thibaut Courtois", "p2": "Dani Carvajal" }
}
```
TTL: 7200s (2h).

---

### 5.2 `POST /game/guess`

Prüft eine Eingabe gegen **alle noch ungelösten Spieler** der Session (zentrales Suchfeld-Paradigma).

**Request:**
```json
{ "sessionId": "uuid", "input": "Courtois" }
```

**Matching-Logik (Server-side):**

```typescript
import { normalizeStr, levenshtein } from './utils/string';

function matchesPlayer(input: string, fullName: string): boolean {
  const normInput = normalizeStr(input);  // lowercase, strip diacritics
  const normFull  = normalizeStr(fullName);

  // 1. Exact full name
  if (normInput === normFull) return true;

  // 2. Last name match (last token)
  const parts    = normFull.split(' ');
  const lastName = parts[parts.length - 1];
  if (normInput === lastName) return true;

  // 3. Single-name / nickname (1-token full name)
  if (parts.length === 1 && normInput === parts[0]) return true;

  // 4. Fuzzy on full name (Levenshtein ≥ 82% similarity)
  const simFull = 1 - levenshtein(normInput, normFull) / Math.max(normInput.length, normFull.length);
  if (simFull >= 0.82) return true;

  // 5. Fuzzy on last name (only if last name ≥ 4 chars)
  if (lastName.length >= 4) {
    const simLast = 1 - levenshtein(normInput, lastName) / Math.max(normInput.length, lastName.length);
    if (simLast >= 0.82) return true;
  }

  return false;
}

// Normalization helper
function normalizeStr(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining diacritics (ü→u, é→e etc.)
    .replace(/[^\w\s]/g, '')
    .trim();
}
```

**Wichtig:** Vorname alleine (`"Thomas"`) matcht NICHT außer es ist ein bekannter Einzel-Name (nur ein Token im fullName). Die Nachname-Regel schützt vor versehentlichem Lösen durch häufige Vornamen.

**Response bei Treffer:**
```json
{ "correct": true, "matchedPlayerId": "p1", "name": "Thibaut Courtois" }
```

**Response bei keinem Treffer:**
```json
{ "correct": false }
```

Der Server durchläuft alle `!solved`-Spieler der Session und gibt beim **ersten Match** den Treffer zurück.

---

### 5.3 `GET /player/:playerId/career?sessionId=uuid`

Gibt Karrieredaten ohne Namen zurück (für Tipp-Drawer).

**Response:**
```json
{
  "playerId": "p1",
  "position": "GK",
  "nationality": "Belgium",
  "nationalityFlag": "🇧🇪",
  "career": [
    { "clubId": "chelsea", "clubName": "Chelsea", "logoUrl": "https://...", "fromYear": 2014, "toYear": 2018 }
  ]
}
```

---

### 5.4 `POST /game/finish`

Schließt Match ab, schreibt Ergebnis in DB, berechnet Progression.

**Request:** `{ "sessionId": "uuid" }`

**Response:**
```json
{
  "result": { "solved": 11, "total": 11, "durationSec": 187, "isWin": true },
  "progression": {
    "xpGained": 150, "lpChange": 25, "newXP": 1490, "newLP": 310,
    "newRank": "Silver 2", "rankChanged": true,
    "newAchievements": ["speed_demon"]
  }
}
```

---

### 5.5 `GET /players/search?q=:query&limit=8`

Globaler Spieler-Pool für Autocomplete. **Gibt NUR Namen zurück – kein clubId, kein leagueId.**

**Response:**
```json
{
  "results": [
    { "name": "Thibaut Courtois" },
    { "name": "Cristiano Ronaldo" }
  ]
}
```

Implementierung: PostgreSQL Full-Text-Search auf einer `players_pool`-Tabelle oder In-Memory-Cache.

**Rate-Limit:** 30 Requests/Minute pro IP (kein Auth erforderlich, aber öffentlich zugänglich).

---

### 5.6 User-Endpunkte

| Method | Path | Beschreibung |
|--------|------|--------------|
| GET    | `/user/profile` | Eigenes Profil (JWT) |
| PATCH  | `/user/profile` | Username / Avatar ändern |
| GET    | `/user/history?limit=20&offset=0` | Match-Verlauf |
| GET    | `/user/achievements` | Alle Achievements mit Unlock-Status |

---

## 6. PlayerMatchService (Kernlogik)

```typescript
export class PlayerMatchService {
  /**
   * Iteriert über alle ungelösten Spieler der Session und gibt
   * den ersten Match zurück, oder null wenn keiner passt.
   */
  findMatch(input: string, session: GameSession): { playerId: string; name: string } | null {
    for (const [playerId, data] of Object.entries(session.players)) {
      if (data.solved) continue;
      if (matchesPlayer(input, data.name)) {
        return { playerId, name: data.name };
      }
    }
    return null;
  }

  /**
   * Normalisiert einen String:
   * lowercase → NFD → strip diacritics → strip punctuation → trim
   */
  normalize(s: string): string { ... }

  /**
   * Levenshtein-Distanz (iterative DP, O(m×n))
   */
  levenshtein(a: string, b: string): number { ... }

  /**
   * Ähnlichkeits-Ratio: 1 - distance / max(len_a, len_b)
   */
  similarity(a: string, b: string): number { ... }
}
```

---

## 7. GameSessionService

```typescript
interface SessionPlayer {
  name: string;       // NUR in Redis, niemals im Response
  solved: boolean;
  wrongAttempts: number;
}

interface GameSession {
  sessionId: string;
  userId: string;
  mode: 'tutorial' | 'single' | 'series';
  difficulty: 'easy' | 'medium' | 'hard';
  startedAt: number;
  players: Record<string, SessionPlayer>;  // key = playerId
}

class GameSessionService {
  async create(userId: string, team: TeamData, opts: GameOptions): Promise<string>;
  async get(sessionId: string): Promise<GameSession | null>;
  async markSolved(sessionId: string, playerId: string): Promise<void>;
  async incrementWrong(sessionId: string): Promise<void>;
  async finish(sessionId: string): Promise<FinishResult>;
  async delete(sessionId: string): Promise<void>;
}
```

Redis-Keys:
- `session:{sessionId}` → JSON (TTL 7200s)
- `session:{sessionId}:lock` → Mutex (TTL 5s, für Race-Conditions bei schnellen Guess-Submits)

---

## 8. ProgressionService

```typescript
class ProgressionService {
  calcXP(opts: { difficulty: Difficulty; solved: number; total: number; durationSec: number }): number {
    // Basis: easy 100 / medium 150 / hard 250 (Sieg)
    // Bonus +50 wenn all 11 gelöst, +30 wenn < 120s
    // Niederlage: easy 30 / medium 50 / hard 80
  }

  calcLP(opts: { mode: GameMode; difficulty: Difficulty; isWin: boolean }): number {
    // Einzel: Sieg +25, Niederlage -20
    // Serie 2/3: Sieg +40, Niederlage -30
    // Schwer-Bonus: +10 LP
  }

  getRankFromLP(lp: number): Rank {
    // 0–99: Bronze 3, 100–199: Bronze 2, ..., 1100+: Platinum 1
  }

  async applyToProfile(userId: string, delta: { xp: number; lp: number }): Promise<UpdatedProfile> {
    // Atomic: XP += delta.xp (niemals sinken), LP = max(0, LP + delta.lp)
    // Level = floor(XP / 500) + 1
    // Rank = getRankFromLP(neues_LP)
  }
}
```

---

## 9. FootballApiService

```typescript
class FootballApiService {
  // Alle Requests werden 24h in Redis gecacht (historische Daten: 7 Tage)
  async getSquad(teamId: number, season: number): Promise<Player[]>;
  async getPlayerTransfers(playerId: number): Promise<Transfer[]>;
  async getTeamsByLeague(leagueId: number, season: number): Promise<Team[]>;

  private async cachedRequest<T>(key: string, fetcher: () => Promise<T>, ttl = 86400): Promise<T>;
}
```

**Liga-IDs (API-Football):**

| Liga | ID | Difficulty |
|------|----|------------|
| La Liga | 140 | easy |
| Premier League | 39 | easy |
| Bundesliga | 78 | easy |
| Serie A | 135 | easy |
| Ligue 1 | 61 | easy |
| Champions League | 2 | easy (nur CL-Teams) |
| 2. Bundesliga | 79 | hard |
| MLS | 253 | hard |
| Eredivisie | 88 | hard |

**Rate-Limit Free Plan:** 100 Requests/Tag → Redis-Cache ist **Pflicht**.

---

## 10. Middleware

### Auth (`middleware/auth.ts`)
```typescript
export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid token' });
  req.user = user;
  next();
}
```

### Rate-Limits
- `/game/guess`: 60 req/min pro User (Cheat-Schutz)
- `/players/search`: 30 req/min pro IP
- `/game/start`: 10 req/h pro User

---

## 11. ENV-Variablen

```env
PORT=3001
NODE_ENV=development

SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJh...
SUPABASE_SERVICE_ROLE_KEY=eyJh...

REDIS_URL=redis://default:password@redis-url:6379

FOOTBALL_API_KEY=your-rapidapi-key
FOOTBALL_API_HOST=api-football-v1.p.rapidapi.com

FRONTEND_URL=http://localhost:5173
```

---

## 12. Frontend-Integration

```typescript
// frontend/src/services/api.ts
const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api/v1';

export const api = {
  game: {
    start:  (body: { mode: string; difficulty: string }) => post('/game/start', body),
    // Zentrales Suchfeld: schickt nur den rohen Input-String
    guess:  (sessionId: string, input: string) => post('/game/guess', { sessionId, input }),
    finish: (sessionId: string) => post('/game/finish', { sessionId }),
  },
  players: {
    search: (q: string) => get(`/players/search?q=${encodeURIComponent(q)}`),
    career: (id: string, sessionId: string) => get(`/player/${id}/career?sessionId=${sessionId}`),
  },
  user: {
    profile:      () => get('/user/profile'),
    history:      (limit = 20, offset = 0) => get(`/user/history?limit=${limit}&offset=${offset}`),
    achievements: () => get('/user/achievements'),
  },
};
```

---

## 13. Implementierungsreihenfolge

| Schritt | Aufgabe |
|---------|---------|
| 1 | Basis-Setup: Express + TypeScript + Zod ENV + Supabase + Redis |
| 2 | Auth-Middleware + Profil-Trigger in Supabase + `/user/profile` |
| 3 | GameSessionService (In-Memory) + `/game/start` mit Mock-Team |
| 4 | **PlayerMatchService** mit Fuzzy + Normalisierung + `/game/guess` |
| 5 | `/players/search` mit Anti-Spoiler (nur Namen) |
| 6 | FootballApiService mit Redis-Caching + echte Teams |
| 7 | ProgressionService + `/game/finish` + Achievement-Check |
| 8 | Rate-Limiting + Input-Validation (zod) auf allen Endpunkten |

---

## 14. Stolpersteine & Hinweise

- **Fuzzy threshold:** 0.82 ist der empfohlene Startwert. Zu niedrig (< 0.75) → false positives (z.B. "Kroos" löst "Gross"). Zu hoch (> 0.9) → Tippfehler werden abgelehnt. Testen mit echten Spielernamen.
- **Nachname-Regel:** Verhindert, dass "Thomas" alle Spieler namens Thomas löst. Nur der **letzte Token** des Namens zählt als Nachname.
- **Neymar-Edge-Case:** Spieler wie "Neymar" (ein Token im fullName) werden durch die Single-Token-Regel korrekt behandelt.
- **Race-Condition:** Wenn User zwei Guesses gleichzeitig sendet (schnelles Typing + Enter), kann es zu doppelten Sessions kommen → Redis-Lock (`SET NX EX 5`) auf `/game/guess`.
- **Session-Expiry während Match:** Wenn Redis-TTL abläuft → `/game/guess` gibt `{ error: 'session_expired' }` zurück → Frontend zeigt "Match abgelaufen"-Modal und navigiert zur Startseite.
- **API-Football Wappen:** Externe Bild-URLs können 403 returnen. Wappen in Supabase Storage spiegeln oder `onError` im Frontend (bereits implementiert im Frontend).
