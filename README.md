# GuessTheTeam

React/Vite-Frontend auf Vercel, Express-API und PostgreSQL auf Hetzner.

Einrichtung, Repo-Analyse, Datenübernahme und Deployment stehen in [docs/migration.md](docs/migration.md).

```bash
npm ci
# .env.example nach .env kopieren und PostgreSQL-Zugang konfigurieren
npm run db:migrate
npm run backend:dev
# Zweites Terminal
npm run dev
```

Die API verwendet eigene cookiebasierte Authentifizierung mit E-Mail-Bestätigung und Passwort-Reset. SMTP wird im Backend konfiguriert. Frontend-Konfiguration auf Vercel:
`VITE_API_BASE_URL=https://api.guesstheteam.de/api/v1`.

Der gewünschte Account-Neustart mit neuem Admin ist über `npm run db:reset:accounts -- --execute` vorbereitet. Dafür `DATABASE_URL` und `ADMIN_EMAIL` setzen; Details stehen in der Migrationsanleitung.

Zentrale Serverkonfiguration: `/root/guesstheteam/.env`. Für Brevo dort `SMTP_USER` (SMTP-Login) und `SMTP_PASSWORD` (SMTP-Schlüssel) eintragen. Alle Backend-Skripte aus diesem Projektordner ausführen.
