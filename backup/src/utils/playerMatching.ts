export function normalizeStr(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function levenshtein(a: string, b: string): number {
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

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}

export function matchesPlayer(input: string, fullName: string): boolean {
  const normInput = normalizeStr(input);
  const normFull = normalizeStr(fullName);

  if (!normInput || !normFull) return false;
  if (normInput === normFull) return true;

  const parts = normFull.split(' ');
  const lastName = parts[parts.length - 1];

  if (normInput === lastName) return true;
  if (parts.length === 1 && normInput === parts[0]) return true;
  if (similarity(normInput, normFull) >= 0.82) return true;

  return lastName.length >= 4 && similarity(normInput, lastName) >= 0.82;
}
