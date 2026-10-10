-- Preserve the exact completion response for retries after a lost connection.
ALTER TABLE match_results ADD COLUMN IF NOT EXISTS completion_response jsonb;
