export function getMinimumSolved(difficulty: 'easy' | 'medium' | 'hard', total = 11) {
  return Math.min(total, difficulty === 'hard' ? 3 : 4);
}

// Interpolate between checkpoints to avoid sudden XP drops at time boundaries.
export function getTimeXpMultiplier(durationSec: number) {
  const checkpoints = [[120, 1], [300, 0.8], [600, 0.5], [900, 0.25]];
  const seconds = Math.max(0, durationSec);
  if (seconds <= checkpoints[0][0]) return 1;
  for (let index = 1; index < checkpoints.length; index++) {
    const [endTime, endMultiplier] = checkpoints[index];
    const [startTime, startMultiplier] = checkpoints[index - 1];
    if (seconds <= endTime) return startMultiplier + (endMultiplier - startMultiplier) * (seconds - startTime) / (endTime - startTime);
  }
  return 0.25;
}
