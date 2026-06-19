const STORAGE_KEY = 'footyguesser.casualFreeSkips.v1';
export const DAILY_CASUAL_SKIP_LIMIT = 3;

interface DailyCasualSkipState {
  date: string;
  used: number;
}

function todayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function readState(): DailyCasualSkipState {
  const fallback = { date: todayKey(), used: 0 };

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw) as Partial<DailyCasualSkipState>;
    if (parsed.date !== fallback.date) return fallback;

    return {
      date: fallback.date,
      used: Math.max(0, Math.min(DAILY_CASUAL_SKIP_LIMIT, Number(parsed.used) || 0)),
    };
  } catch {
    return fallback;
  }
}

function writeState(state: DailyCasualSkipState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getDailyCasualSkipsRemaining() {
  return DAILY_CASUAL_SKIP_LIMIT - readState().used;
}

export function consumeDailyCasualSkip() {
  const state = readState();
  if (state.used >= DAILY_CASUAL_SKIP_LIMIT) return false;

  writeState({ ...state, used: state.used + 1 });
  return true;
}
