import type { GameSession } from '../types';

export class PlayerMatchService {
  findMatch(input: string, session: GameSession): { playerId: string; name: string } | null {
    for (const [playerId, data] of Object.entries(session.players)) {
      if (data.solved) continue;
      if (this.matchesPlayer(input, data.name)) {
        return { playerId, name: data.name };
      }
    }

    return null;
  }

  matchesPlayer(input: string, fullName: string): boolean {
    const normInput = this.normalize(input);
    const normFull = this.normalize(fullName);

    if (!normInput || !normFull) return false;
    if (normInput === normFull) return true;

    const parts = normFull.split(' ');
    const lastName = parts[parts.length - 1];

    if (normInput === lastName) return true;
    if (parts.length === 1 && normInput === parts[0]) return true;
    if (this.similarity(normInput, normFull) >= 0.82) return true;

    return lastName.length >= 4 && this.similarity(normInput, lastName) >= 0.82;
  }

  normalize(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, '')
      .trim()
      .replace(/\s+/g, ' ');
  }

  similarity(a: string, b: string): number {
    return 1 - this.levenshtein(a, b) / Math.max(a.length, b.length);
  }

  levenshtein(a: string, b: string): number {
    const rows = Array.from({ length: a.length + 1 }, (_, index) => index);

    for (let i = 1; i <= b.length; i += 1) {
      let previous = rows[0];
      rows[0] = i;

      for (let j = 1; j <= a.length; j += 1) {
        const current = rows[j];
        const cost = a[j - 1] === b[i - 1] ? 0 : 1;
        rows[j] = Math.min(rows[j] + 1, rows[j - 1] + 1, previous + cost);
        previous = current;
      }
    }

    return rows[a.length];
  }
}
