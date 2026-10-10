-- Align previously imported historical seasons with the hard pool.
-- Active games and already awarded rewards retain their original settings.
UPDATE team_seasons
SET difficulty = 'hard', team = jsonb_set(team, '{difficulty}', '"hard"'::jsonb)
WHERE provider = 'seed-openai-sync' AND season IN ('2013', '2014', '2015');
