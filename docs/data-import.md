# Transfermarkt Data Import

We use `dcaribou/transfermarkt-datasets` as the upstream source, but we do not commit the large raw dataset.

## Local Workflow

1. Download or export these CSV files into `data/transfermarkt/`:

   - `clubs.csv` or `clubs.csv.gz`
   - `players.csv` or `players.csv.gz`
   - `games.csv` or `games.csv.gz`
   - `game_lineups.csv` or `game_lineups.csv.gz`
   - `transfers.csv` or `transfers.csv.gz` optional, but useful for career hints

2. Generate a small game seed:

   ```sh
   npm run data:import:transfermarkt -- \
     --source data/transfermarkt \
     --out data/seeds/footyguesser-seed.json \
     --limit 80 \
     --min-season 2018 \
     --max-season 2026
   ```

3. The generated JSON is intentionally ignored by git. It is local runtime data.

## Why This Shape

The upstream dataset is excellent, but too large to ship with the app. The importer creates a curated subset of team-season starting elevens. That seed can run locally now and later be imported into Postgres/Supabase for production.

## Output Contract

The generated seed contains:

- `teams`: team-season game data without exposing it to the frontend directly
- `players`: global player pool for autocomplete
- `generatedAt`: import timestamp
- `source`: import metadata

Player names must still stay server-side during gameplay. The seed is backend data, not public frontend data.
