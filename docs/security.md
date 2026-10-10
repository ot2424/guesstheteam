# Security and reliability

The API authenticates every game, profile and online request. It uses the logged-in
account to authorize resource ownership; supplied user IDs, rank, level, solved
counts, XP, LP, elapsed time and series counters cannot grant privileges or rewards.
Changing a casual game's difficulty is an ordinary game option. Ranked difficulty
and unlocks come from the persisted account.

Sessions use random 256-bit tokens, hashed in PostgreSQL, with HttpOnly/Secure
host-only cookies in production. Passwords use scrypt; imported bcrypt hashes are
supported. Password resets expire, are single use and revoke existing sessions.
Mutations require an explicitly configured frontend Origin. CORS is not a substitute
for authentication: a non-browser client can supply an Origin header.

PostgreSQL advisory locks serialize mutations on the same game or online matchup.
Inventory changes, guesses, match completion and persisted rewards share one
transaction. Nested services reuse that transaction. Duplicate completion cannot
award points again, and errors roll back consumed inventory. Database statements
and lock waits have time limits. HTTP request reception and graceful shutdown are
bounded, and systemd restarts crashed services.

The API limits requests to 300/minute per IP, game writes to 90/minute per account,
and starts to 12/minute per account. Authentication has an IP limit and failed-login
account limits. Nginx also limits request rates, connections and slow requests.
Nginx overwrites X-Forwarded-For; Express trusts only the local proxy. Database and
application ports listen locally, and the host firewall permits only SSH/HTTP/HTTPS.

Production JSON responses are not cached. Frontend headers in vercel.json constrain
scripts, framing, form targets and sensitive browser permissions. Inline styling
remains necessary for the current interface, while inline scripts are prohibited.

Run checks against a disposable, migrated database:

```sh
MIGRATION_TEST_DATABASE=true NODE_ENV=development \
DATABASE_URL=postgresql://postgres@127.0.0.1:55432/postgres \
CORS_ORIGIN=http://localhost:5173 GUESSTHETEAM_TEAM_SOURCE=postgres \
node --import tsx scripts/check-security.ts
```

The checks cover untrusted origins, forged cookies, foreign IDs, invalid and
oversized inputs, server-owned progression, prototype property names, concurrent
joker/skip/finish requests, transaction rollback, online concurrency and limits.
CI runs them alongside existing account and game integration checks.

`GTT_TEST_CSP=true` enables the proposed frontend policy during mobile browser tests.
Dependency audits reflect known advisories at the time of the check, not a guarantee
against future vulnerabilities. API limits and a local firewall do not guarantee
availability during a large distributed attack; upstream mitigation is still needed
if traffic or attacks exceed server capacity. External backups and a staffed alert
destination are still outstanding. This review is not an independent penetration test.

The host audit also found SSH root/password login enabled and no active fail2ban
service. Disabling password login must wait until the operator confirms a tested
key-based login; this review has not changed SSH access. This remains a priority.
