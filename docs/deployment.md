# Deployment

Die aktuelle Architektur verwendet Vercel für das Frontend und Hetzner für Express und PostgreSQL.

Die vollständige Anleitung mit Datenübernahme, DNS, TLS und systemd steht in [migration.md](migration.md).

`vercel.json` setzt für den Frontend-Build `VITE_API_BASE_URL=https://api.guesstheteam.de/api/v1`. Ein Push auf den mit Vercel verbundenen Produktionsbranch löst das Deployment aus. Datenbank- und SMTP-Zugangsdaten bleiben ausschließlich in der zentralen `.env` auf Hetzner.

App-Modus, Offline-/Update-Anzeige, sichere Spiel-Wiederaufnahme sowie Backup- und Monitoring-Anleitungen: [operations.md](operations.md). Die Betriebs-Timer sind auf Hetzner installiert. Die additive Migration `0003_match_completion_response.sql` wurde nach einer erfolgreich geprüften Produktionssicherung angewendet.
