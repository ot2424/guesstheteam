# Betrieb und Prüfungen

Frontend: Vercel. API und PostgreSQL: Hetzner. Zentrale Zugangsdaten bleiben in `/root/guesstheteam/.env` und werden nicht veröffentlicht.

## Datenbanksicherung

`npm run db:backup` erstellt einen PostgreSQL-Custom-Dump in `/var/backups/guesstheteam`. Verzeichnis: 0700, Dateien: 0600. Ein neuer Dump wird erst nach erfolgreicher Erstellung und Prüfung veröffentlicht. `latest.json` enthält Zeitpunkt, Dateiname und Größe, keine Zugangsdaten. Aufbewahrung: 14 Tage. Der Timer läuft täglich ab 03:15 UTC, mit bis zu 10 Minuten Verzögerung und Nachholung verpasster Läufe.

```bash
bash deploy/install-operations.sh
systemctl list-timers guesstheteam-backup.timer guesstheteam-monitor.timer
journalctl -u guesstheteam-backup.service -n 30
bash deploy/verify-db-backup.sh /var/backups/guesstheteam/DATEINAME.dump
```

Die Wiederherstellungsprüfung nutzt einen eigenen temporären PostgreSQL-Cluster mit privatem Unix-Socket. Sie verändert die Live-Datenbank nicht und entfernt anschließend ihre Testkopie. Am 10.10.2026 wurde ein Live-Backup erfolgreich wiederhergestellt (12 Tabellen, 1 bestehender Nutzer, 23 Teams).

Die Sicherungen liegen derzeit auf demselben Server. Ein Backup-Speicher außerhalb des Servers ist noch zu konfigurieren. Ohne ihn schützt die Sicherung nicht gegen den vollständigen Verlust dieses Servers. Das Ziel und die Zugangsdaten müssen vom Betreiber bereitgestellt werden.

## Überwachung

`npm run check:operations` prüft lokale und öffentliche API-Bereitschaft, das Frontend, Datenbankzugriff, verspätete Account-Mails, Backup-Alter (maximal 30 Stunden) und freien Speicher (mindestens 10 %). Der Timer führt die Prüfung alle fünf Minuten aus. Fehler führen zu Exit-Code 1 und werden im systemd-Journal sichtbar. Dabei werden keine Mailadressen, Tokens oder Zugangsdaten ausgegeben.

```bash
journalctl -u guesstheteam-monitor.service -n 30
systemctl status guesstheteam-monitor.timer
```

Ein externer Alarmkanal bzw. ein von diesem Server unabhängiger Verfügbarkeitsdienst ist noch zu verbinden. Der lokale Monitor kann einen vollständigen Serverausfall nicht selbst melden.

## Anwendungstests

- `npm run lint`, `npm run build`, `npm run backend:build`, `npm test`.
- `scripts/check-db-migration.ts` darf nur mit `MIGRATION_TEST_DATABASE=true` gegen eine isolierte Testdatenbank laufen. Es prüft Registrierung, Bestätigung, Reset-Ablauf und -Wiederverwendung, Session-Widerruf, Eigentümerschaft, parallele Tipps, serverseitige Wiederaufnahme, wiederholte Abschlüsse, doppelte Rewards, Inventar, Online-Duelle und die Mailwarteschlange.
- `npm run check:live` nutzt einen neuen temporären Testaccount für HTTPS, sichere Cookies, CORS/CSRF und Spiel-Wiederaufnahme. Er versendet keine Mail und entfernt den Account im Anschluss. Bestehende Zugangsdaten und Accounts werden nicht verändert.
- `npm run check:mobile` benötigt eine separat installierte Playwright-Version und Chromium. Für lokale Tests wurde `GTT_PLAYWRIGHT_MODULE=/tmp/gtt-browser/node_modules/playwright` und `PLAYWRIGHT_BROWSERS_PATH=/tmp/gtt-browser/browsers` verwendet. Der Test läuft gegen `npm run preview`, nutzt API-Testdaten und prüft iPhone-/Android-Bildschirmgrößen, Navigation, Reset-Formular, Offline-Wiederanlauf, Spiel-Wiederaufnahme, Rennes-Wappen und erhaltene Eingaben nach Verbindungsfehlern. Browseremulation ersetzt keine Prüfung auf echten Geräten.

## Veröffentlichungen und App-Updates

Ein Update auf dem Produktionsbranch `main` löst das bestehende Vercel-Deployment aus. Statische Service-Worker-Dateien werden pro Build versioniert. Anmeldeseiten und API-Antworten werden nicht offline gecacht. Offline-Navigation zeigt eine eigene Seite. Neue Versionen werden erst nach Nutzeraktion aktiviert; während Spiel, Online-Duell oder Account-Aktion erscheint kein Update-Button.

API: zuerst ein Backup erstellen und prüfen, `npm run db:migrate` ausführen, dann `bash deploy/install-api.sh`. `0003_match_completion_response.sql` ist additiv. Bei einem API-Rollback kann die neue Spalte bestehen bleiben.

## Noch benötigte Betreiberangaben

Die öffentlichen Angaben stehen in `src/lib/legalDetails.ts`. Name, Anschrift und Kontakt-E-Mail sind noch leer. Impressum und Datenschutz sind bis zur Ergänzung Entwürfe. Ebenfalls offen: Speicherfristen für inaktive Accounts und Protokolle sowie die tatsächlichen Verträge/Transfergrundlagen der verwendeten Dienstleister. Diese Angaben werden nicht aus Git-Identitäten oder Testaccounts abgeleitet.
