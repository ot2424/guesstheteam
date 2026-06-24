import { describe, expect, it } from 'vitest';
import { matchesPlayer, normalizeStr } from './playerMatching';

describe('playerMatching', () => {
  it('normalizes casing, accents, whitespace and punctuation', () => {
    expect(normalizeStr('  İlkay   Gündoğan!! ')).toBe('ilkay gundogan');
  });

  it('accepts exact names, last names and small typos', () => {
    expect(matchesPlayer('Erling Haaland', 'Erling Haaland')).toBe(true);
    expect(matchesPlayer('Haaland', 'Erling Haaland')).toBe(true);
    expect(matchesPlayer('Gundogan', 'İlkay Gündoğan')).toBe(true);
    expect(matchesPlayer('Mohamed Sala', 'Mohamed Salah')).toBe(true);
  });

  it('rejects unrelated names so wrong guesses do not solve cards', () => {
    expect(matchesPlayer('Max Mustermann', 'Charles De Ketelaere')).toBe(false);
    expect(matchesPlayer('', 'Charles De Ketelaere')).toBe(false);
  });
});
