# Supabase → PostgreSQL auf Hetzner

## Repo-Analyse

- Ein npm-Paket enthält Vite/React und Express 5. `backend:build` prüft TypeScript ohne JS-Ausgabe; der Server startet mit tsx. Das Vercel-Deployment baut ausschließlich das Frontend.
- `src/lib/supabase.ts` initialisierte den SDK-Client; `useAuth.tsx` registrierte und authentifizierte direkt gegen Supabase, `api.ts` übergab Supabase-Bearer-Tokens.
- Backend-Middleware prüfte Tokens über Supabase; fehlende Konfiguration erlaubte außerhalb Production automatisch `dev-user`.
- ProfileService nutzte Client-Tokens und RLS; GameSessionService, TeamSeedService und OnlineMatchupService sowie fünf Datenskripte nutzten Service-Role-Zugriff.
- Die sechs alten Migrationen definierten Profile, Matchhistorie, Inventar, aktive Sessions, Team-Saisons, Freundschaften und Online-Duelle. Fremdschlüssel, Profil-Trigger und Policies waren an `auth.users`/`auth.uid()` gebunden.

## Umsetzung im Repository

1. `backend/migrations/0001_initial.sql` enthält alle Anwendungstabellen sowie eigene `users` und `auth_sessions`. `db:migrate` führt versionierte Migrationen transaktional mit Advisory Lock aus.
2. Auth-Endpunkte unter `/api/v1/auth`: `register`, `login`, `me`, `logout`. Neue Passwörter werden mit scrypt und individuellen Salts gehasht. Zufällige Sessions werden nur als SHA-256-Hash gespeichert, laufen standardmäßig nach 30 Tagen ab und werden beim Logout gelöscht. Kein automatischer Entwicklungslogin.
3. Das Frontend sendet Cookies mit `credentials: include`. In Production: Secure, HttpOnly, SameSite=None und Host-Cookie ohne Domain-Freigabe. Jeder schreibende Browser-Request benötigt eine explizit erlaubte Origin. Registrierung/Login sind begrenzt. Datenbankzugriffe erfolgen ausschließlich im Backend mit parametrisiertem SQL.
4. Profilzugriffe filtern nach der authentifizierten Nutzer-ID. Matchpersistierung sperrt das Profil und speichert Historie plus Fortschritt gemeinsam; `(user_id, session_id)` verhindert doppelte Rewards. Inventar wird atomar reduziert. DB-Fehler werden nicht als erfolgreicher Speicherzugriff behandelt.
5. Teams und Datenwerkzeuge verwenden PostgreSQL. Der Supabase-SDK wurde entfernt. `supabase/migrations` bleibt nur als historische Quelle für die Datenübernahme; diese Dateien nicht auf der neuen DB ausführen.

Registrierung erfordert jetzt E-Mail-Bestätigung vor dem ersten Login. Bestätigungslinks gelten 24 Stunden, Passwort-Reset-Links 30 Minuten. Beide sind nur einmal verwendbar und werden als Hash in `auth_action_tokens` gespeichert. Ein Reset widerruft alle Sessions und versendet eine Änderungsmitteilung. Das Frontend bietet Bestätigung, erneuten Versand und „Passwort vergessen“. Neue Passwörter benötigen mindestens 12 Zeichen. OAuth ist weiterhin nicht implementiert.

## Lokal starten

Node.js 24 und eine lokale PostgreSQL-Instanz verwenden. Datenbank und Passwortrolle anlegen, `.env.example` nach `.env` kopieren und `DATABASE_URL` anpassen. Passwortsonderzeichen in der URL percent-encodieren.

```bash
npm ci
npm run db:migrate
npm run data:sync:postgres -- --input data/seeds/guesstheteam-seed.json
npm run data:sync:worldcup
npm run backend:dev
# Zweites Terminal:
npm run dev
```

Alternativ `GUESSTHETEAM_TEAM_SOURCE=seed` für lokale JSON-Teams; Auth und Spielstände brauchen weiterhin PostgreSQL. API bindet standardmäßig an 127.0.0.1:4000.

## Accounts neu starten und Admin anlegen

Aktuelle Vorgabe: Alle bisherigen Accounts entfernen und genau einen neuen Admin-Testaccount anlegen. Keine alten Accounts importieren. Das folgende Werkzeug betrifft die PostgreSQL-Datenbank aus `DATABASE_URL`; es löscht keine Accounts im alten Supabase-Projekt.

Vor der Ausführung die API stoppen, Migrationen anwenden und `ADMIN_EMAIL` auf die gewünschte echte E-Mail-Adresse setzen. `ADMIN_CREDENTIALS_FILE` kann einen neuen Dateipfad für die Zugangsdaten bestimmen. Die Zugangsdaten-Datei darf noch nicht existieren.

```bash
npm run db:migrate
npm run db:reset:accounts
# Führt die bereits gewünschte Löschung und Admin-Neuanlage aus:
npm run db:reset:accounts -- --execute
```

Die Vorschau zählt Accounts ohne Änderungen. Die Ausführung löscht Nutzer, Profile, Sessions, Bestätigungs-/Reset-Tokens, Mailwarteschlange, persönliche Matchhistorie, Freundschaften und Online-Duelle über Fremdschlüssel. Teams bleiben erhalten. Löschung und Admin-Neuanlage sind eine Transaktion; schlägt die Neuanlage fehl, bleiben die Accounts bestehen.

Der Admin erhält `role=admin`, Benutzername `admin_test`, ein zufälliges Passwort und eine bereits bestätigte E-Mail für den Bootstrap-Login. Die Zugangsdaten werden ausschließlich in einer neuen Datei mit Modus 0600 gespeichert und nicht im Terminal ausgegeben. Ohne `ADMIN_CREDENTIALS_FILE` liegt sie unter einem zufälligen Pfad in `/tmp`. Der Admin startet mit einem normalen neuen Spielprofil; es gibt derzeit keine Admin-Oberfläche oder zusätzlichen Admin-Endpunkte. Die Datei nach Übernahme der Zugangsdaten entfernen und das Testpasswort per Reset ändern.

Die Löschung im alten Supabase-Projekt benötigt separat dessen Datenbankzugang. Solange dieser fehlt, bleiben alte Accounts dort bestehen.

## Bestätigung und Passwort-Reset konfigurieren

Backend-Variablen: `AUTH_FRONTEND_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`. Production erfordert eine HTTPS-Frontend-URL sowie SMTP-Host und Absender. Port 465 verwendet `SMTP_SECURE=true`; Port 587 nutzt `SMTP_SECURE=false` mit verpflichtendem STARTTLS. Siehe [Nodemailer SMTP](https://nodemailer.com/smtp). SPF/DKIM und Absenderfreigabe beim Mailanbieter einrichten.

Auth-Mails werden in derselben Datenbanktransaktion wie der Token angelegt. Der API-Prozess arbeitet die Warteschlange alle zwei Sekunden ab, versucht Zustellfehler nach einer Minute erneut und entfernt abgelaufene Nachrichten. Bei einem Absturz nach SMTP-Annahme kann eine Nachricht mehrfach ankommen; der Link bleibt trotzdem nur einmal verwendbar. Die Outbox enthält temporär die vollständigen Mailtexte inklusive Link und ist nur für das Backend bestimmt. Tokenwerte dürfen weder als API-Antwort noch als Log ausgegeben werden.

Ohne SMTP bleiben Mails in Development in `auth_mail_outbox`; es findet kein externer Versand statt. Tests simulieren den Versand. Auf Production müssen Zustellung, Spamordner und Links über die echte Domain geprüft werden.

Endpunkte unter `/api/v1/auth`: `resend-verification`, `verify-email`, `forgot-password`, `reset-password`, jeweils POST. Reset-Anforderungen geben für bekannte und unbekannte Adressen dieselbe Antwort. IP-Limit und ein Account-Cooldown begrenzen Anfragen. Links tragen Tokens im URL-Fragment, das das Frontend nach dem Einlesen entfernt. Ein ausdrücklicher Klick bestätigt die E-Mail, damit Linkscanner den Token nicht automatisch verbrauchen. Die Umsetzung orientiert sich an [OWASP Passwort-Reset](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).

## Optionale Übernahme alter Daten (aktuell nicht gewünscht)

Zuerst Supabase sichern und Import in einer leeren Testdatenbank proben. Doppelte Nutzernamen, die sich nur in Groß-/Kleinschreibung unterscheiden, müssen vorab bereinigt werden. Neue Indizes verlangen eindeutige Match-Sessions; bestehende Duplikate ebenfalls vorab prüfen.

`db:import:supabase` benötigt eine direkte, TLS-gesicherte PostgreSQL-Verbindung zur alten Supabase-Datenbank (oder deren Session-Pooler), die `auth.users` und alle sieben public-Tabellen lesen darf. Quelle über `SOURCE_DATABASE_URL`, Ziel über `DATABASE_URL` bereitstellen; keine Zugangsdaten ins Git schreiben. TLS-Zertifikatsprüfung nicht deaktivieren.

```bash
npm run db:migrate
npm run db:import:supabase
```

Der Import liest einen konsistenten Snapshot und schreibt Nutzer, Profile, Teams, aktive Spiele, Historie, Freunde und Online-Duelle in einer Zieltransaktion mit erhaltenen IDs. Ein Ziel mit vorhandenen Nutzern wird abgelehnt. Nicht unterstützte OAuth-/passwortlose Accounts führen zum Abbruch und brauchen vorher eine eigene Übernahmestrategie. Alte Sessions werden nicht kopiert. Bei einem Fehler rollt die Zieltransaktion zurück. Der Import lädt Tabellen in den Arbeitsspeicher und ist für den aktuellen Projektumfang vorgesehen; große Datenbestände benötigen einen Batch-/Streaming-Import.

Für den finalen Import alte Schreibzugriffe stoppen und erst nach erfolgreichen Vergleichsprüfungen die neue API freigeben. Zeilenzahlen aller Tabellen, Stichproben von Profilen/Inventar und Logins mit vorhandenen Accounts vergleichen. Supabase erst nach erfolgreicher Umschaltung und vereinbarter Rückfallfrist abschalten.

## Hetzner vorbereiten

1. Service-Benutzer `guesstheteam`, Projekt unter `/opt/guesstheteam`, Node.js 24 und PostgreSQL bereitstellen. Auf diesem Server ist Nginx bereits installiert und soll verwendet werden. Der vorhandene Workspace unter `/root` ist wegen `ProtectHome=true` kein Service-Verzeichnis.
2. PostgreSQL-Rolle mit Passwort und Datenbank `guesstheteam` erstellen. `listen_addresses='localhost'` und SCRAM-Passwortauthentifizierung für lokale TCP-Verbindungen verwenden. Ports 5432 und 4000 nicht öffentlich freigeben. Die Rolle braucht Schema-Rechte für Migrationen. Siehe [PostgreSQL-Authentifizierung](https://www.postgresql.org/docs/current/auth-pg-hba-conf.html).
3. Repository installieren: `npm ci`, `npm run backend:build`. Dev-Abhängigkeiten müssen verfügbar bleiben, da der aktuelle Startbefehl tsx verwendet.
4. `.env.example` als zentrale `/root/guesstheteam/.env` verwenden und echte Datenbankdaten setzen. Datei nur root lesbar machen (systemd liest sie vor dem Benutzerwechsel). Kein `VITE_*`-Secret. Migrationen und Datenskripte aus `/root/guesstheteam` ausführen: dotenv liest dort die zentrale `.env`. systemd liest dieselbe Datei vor dem Benutzerwechsel und übergibt die Werte an den API-Prozess unter `/opt/guesstheteam`. Beim Kopieren des Codes nach `/opt/guesstheteam` die `.env` ausschließen, damit es nur eine aktive Konfigurationsdatei gibt.
5. Schema migrieren, Seed-Skripte ausführen und den gewünschten Account-Neustart mit Admin-Neuanlage durchführen. Dann `deploy/guesstheteam-api.service` nach `/etc/systemd/system/` kopieren, `systemctl daemon-reload` und `systemctl enable --now guesstheteam-api`.
6. DNS A für `api.guesstheteam.de` auf den Server setzen; AAAA nur bei korrekt eingerichteter IPv6-Erreichbarkeit. Frontend-Domain bleibt bei Vercel. `deploy/nginx-api.conf` als eigene Site neben der bestehenden Nginx-Konfiguration installieren. Zuerst nur den HTTP-Block aktivieren, das Zertifikat mit dem dort angegebenen Certbot-Webroot-Befehl ausstellen und anschließend den HTTPS-Block aktivieren. Vor jedem Reload `nginx -t` ausführen. Ports 80/443 müssen erreichbar sein. `deploy/Caddyfile` bleibt eine Alternative für andere Server.
7. `https://api.guesstheteam.de/health` prüft den Prozess, `/ready` zusätzlich die Datenbank. API-Logs mit `journalctl -u guesstheteam-api` prüfen.

Der Service ist für eine einzelne API-Instanz ausgelegt. Der Login-Limiter verwendet Prozessspeicher; horizontale Skalierung benötigt einen gemeinsamen Limiter. Online-Zustände und aktive Spiele werden weiterhin als JSON aktualisiert; gleichzeitige Mutationen derselben Spielsession sind kein vollständig transaktionaler Spielablauf. Das bleibt eine eigene Verbesserung. Abgelaufene Auth-Sessions regelmäßig mit `DELETE FROM auth_sessions WHERE expires_at < now()` entfernen. Tägliche `pg_dump`-Backups außerhalb des Servers aufbewahren und Wiederherstellung testen.

## Vercel umschalten

- `VITE_API_BASE_URL=https://api.guesstheteam.de/api/v1` setzen und neu deployen.
- `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` entfernen.
- Die tatsächlich verwendeten Frontend-Origins in `CORS_ORIGIN` eintragen. Production-Beispiel erlaubt `https://guesstheteam.de` und `https://www.guesstheteam.de`.
- Vercel-Preview-Origins nur explizit hinzufügen. Cross-site-Cookies auf `*.vercel.app` können durch Browser-Tracking-Schutz blockiert werden; Production mit eigener guesstheteam.de-Domain verifizieren.
- Im Browser Registrierung, Anmeldung, Reload, Logout, fremde Spielsession, Matchhistorie, Inventar, Freundschaften und Online-Duelle prüfen. Erst danach alte Supabase-Schlüssel entfernen/rotieren.

## Prüfungen

```bash
npm run backend:build
npm run build
npm test
npm run lint
# Nur gegen eine isolierte Testdatenbank, mit NODE_ENV=development:
# DATABASE_URL setzen, Schema migrieren, CORS_ORIGIN=http://localhost:5173,
# GUESSTHETEAM_TEAM_SOURCE=postgres und MIGRATION_TEST_DATABASE=true setzen.
npm run db:check
```

Den zusätzlichen Löschtest mit `node --import tsx scripts/check-account-reset.ts` unter denselben Testvariablen ausführen. Er verlangt eine leere Nutzertabelle und darf nicht gleichzeitig mit `db:check` auf derselben Datenbank laufen. Er prüft auch den vollständigen Rollback bei gescheiterter Admin-Anlage.

`db:check` erzeugt Testaccounts und prüft SQL-Persistenz, Auth-Ablauf/Widerruf, Nutzerisolation, doppelte Rewards, Inventar-Rennen und Social-/Online-Daten. Nutzer werden danach gelöscht. Die Team-Prüfung erwartet eine ansonsten leere `team_seasons`-Tabelle. Den Check niemals gegen Production laufen lassen.

Die Live-Umstellung ist erst abgeschlossen, wenn Server, DNS/TLS, finaler Datenimport und Vercel-Browserprüfungen durchgeführt wurden. Vor Umschaltung alte Frontend-/API-Version und Datenbanksicherung als Rückfalloption festhalten; nach neuen Schreibzugriffen muss ein Rückfall auch diese Daten berücksichtigen.

## Festgestellter Serverstand

Die Arbeitsumgebung läuft direkt auf dem Hetzner-Server `ubuntu-4gb-nbg1-1`; zusätzlicher SSH-Zugang ist nicht erforderlich. Die Prüfung außerhalb der Sandbox zeigte PostgreSQL 18 auf localhost:5432 und Nginx auf Port 80. Die Projekt-Datenbank und Rolle `guesstheteam`, `/etc/guesstheteam`, `/opt/guesstheteam` und der API-Service existierten noch nicht; Certbot ist installiert, Zertifikate waren noch nicht vorhanden. Die Sandbox kann diese laufenden Dienste nicht vollständig sehen. Live-Accounts und SMTP sind durch diese Bestandsaufnahme nicht verändert worden.

## Eine zentrale Konfiguration

Alle Serverwerte stehen jetzt in `/root/guesstheteam/.env` (Modus 0600). Der alte Pfad `/etc/guesstheteam/backend.env` dient, soweit vorhanden, nur als symbolischer Link auf diese Datei. Das systemd-Template verwendet direkt `/root/guesstheteam/.env`. Die `.env.example` im Repository ist nur eine Vorlage und wird nicht geladen. Für Vercel wird ausschließlich `VITE_API_BASE_URL` im Vercel-Projekt gesetzt; Backend-Secrets bleiben auf Hetzner.

## Live-Einrichtung am 9. Oktober 2026

- PostgreSQL-Datenbank und Rolle `guesstheteam` wurden lokal angelegt; der Zugang steht ausschließlich in der zentralen `.env`.
- Beide Migrationen sind angewendet. In der neuen Datenbank gab es keine alten Accounts; jetzt existiert der bestätigte Admin-Testaccount `onur.t@aol.com` mit Rolle `admin`.
- Admin-Zugangsdaten liegen in `/root/guesstheteam/.admin-test-account.json` (0600, von Git und Deployment ausgeschlossen). Die Datei ist ein Passwortbeleg, keine zweite Anwendungskonfiguration.
- 23 vorhandene Startteams sind in PostgreSQL gespeichert (ein Clubteam und 22 World-Cup-Teams). Weitere alte Supabase-Teamdaten sind nicht übernommen; hierfür fehlen Quelldaten.
- Die API läuft als eigener Service-Benutzer unter `/opt/guesstheteam`. `guesstheteam-api.service` ist aktiviert und liest `/root/guesstheteam/.env` über systemd.
- Nginx stellt `https://api.guesstheteam.de` bereit. Let's-Encrypt-Zertifikat, `certbot.timer` und Nginx-Reload-Hook sind eingerichtet.
- Die öffentliche API wurde mit Bereitschaftsprüfung, Admin-Login, CORS/CSRF, Secure/HttpOnly-Cookies, Profil, Spielstart, SQL-Persistenz, Lösung und Logout geprüft. Der Testspielstand wurde gelöscht; der Admin hat weiterhin ein frisches Profil.
- Die Brevo-Zugangsdaten wurden korrigiert. TLS-Verbindung und SMTP-Anmeldung sind erfolgreich geprüft; der API-Dienst wurde neu gestartet und `/ready` ist über die öffentliche HTTPS-Adresse erfolgreich. Dabei wurde keine Test-E-Mail verschickt. Der tatsächliche Empfang von Bestätigungs- und Reset-Mails muss im Browser geprüft werden. Wiederholbare Prüfung ohne Mailversand: `node scripts/check-smtp.mjs`.
- Vercel ist noch nicht umgestellt: `VITE_API_BASE_URL=https://api.guesstheteam.de/api/v1` setzen, die geänderte Frontend-Version deployen und Browser-Auth prüfen.
- Die alte Supabase-Datenbank wurde nicht gelöscht; dafür fehlen deren Zugangsdaten. Es wurden keine alten Accounts in die neue Datenbank importiert.

Wiederholbares API-Deployment: `bash deploy/install-api.sh`; HTTPS-Einrichtung: `bash deploy/install-https.sh`. Beide Skripte benötigen root und ändern nur die angelegte Projektkonfiguration. Die Startteams können mit `node --import tsx scripts/seed-builtin-teams.ts` erneut synchronisiert werden.
