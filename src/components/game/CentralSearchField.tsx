import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { searchPlayers } from '../../lib/api';

// ─── Component ───────────────────────────────────────────────────────────────
interface Props {
  onGuess: (name: string) => void;
  solvedCount: number;
  totalCount: number;
  disabled?: boolean;
  lastResult?: 'correct' | 'wrong' | null;
}

export function CentralSearchField({ onGuess, solvedCount, totalCount, disabled, lastResult }: Props) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const searchSeqRef = useRef(0);

  const handleInput = useCallback((val: string) => {
    setInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    searchAbortRef.current?.abort();

    debounceRef.current = setTimeout(() => {
      if (val.length >= 2) {
        const controller = new AbortController();
        const searchSeq = searchSeqRef.current + 1;
        searchSeqRef.current = searchSeq;
        searchAbortRef.current = controller;

        void searchPlayers(val, 7, controller.signal)
          .then((response) => {
            if (searchSeqRef.current !== searchSeq) return;
            setSuggestions(response.results.map((result) => result.name));
          })
          .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            if (searchSeqRef.current === searchSeq) setSuggestions([]);
          });
      } else {
        setSuggestions([]);
      }
    }, 120);
  }, []);

  const submit = useCallback((name: string) => {
    if (!name.trim() || disabled) return;
    setSuggestions([]);
    onGuess(name.trim());
    setInput('');
  }, [onGuess, disabled]);

  const progress = Math.round((solvedCount / totalCount) * 100);
  const flash = lastResult === 'correct' ? 'green' : lastResult === 'wrong' ? 'red' : null;

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Search bar */}
      <motion.div
        animate={lastResult === 'wrong' ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.35 }}
        className="relative"
      >
        <div
          className="flex items-center gap-2 rounded-2xl border-2 transition-all duration-200 px-4"
          style={{
            background: flash === 'green'
              ? 'rgba(34,197,94,0.12)'
              : flash === 'red'
              ? 'rgba(239,68,68,0.1)'
              : '#111827',
            borderColor: flash === 'green'
              ? '#22C55E'
              : flash === 'red'
              ? '#EF4444'
              : focused
              ? 'rgba(34,197,94,0.55)'
              : 'rgba(255,255,255,0.1)',
            boxShadow: focused && !flash ? '0 0 0 3px rgba(34,197,94,0.12)' : 'none',
          }}
        >
          {/* Icon */}
          <span className="text-gray-500 text-sm flex-shrink-0">⚽</span>

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit(input)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => { setFocused(false); setSuggestions([]); }, 150)}
            placeholder="Spieler erraten – Nachname oder vollständiger Name…"
            disabled={disabled}
            className="flex-1 bg-transparent py-3.5 text-sm text-white placeholder-gray-600 focus:outline-none"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />

          {/* Submit button */}
          <button
            onClick={() => submit(input)}
            disabled={!input.trim() || disabled}
            className="flex-shrink-0 px-4 py-1.5 rounded-xl text-sm font-extrabold transition-all active:scale-95 disabled:opacity-30"
            style={{ background: '#22C55E', color: '#04130a' }}
          >
            Raten
          </button>
        </div>

        {/* Autocomplete dropdown — ONLY names, no club/league info */}
        <AnimatePresence>
          {suggestions.length > 0 && focused && (
            <motion.ul
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl border overflow-hidden p-1.5"
              style={{ background: '#161d29', borderColor: 'rgba(255,255,255,0.13)', boxShadow: '0 18px 40px rgba(0,0,0,0.55)' }}
            >
              {suggestions.map((s) => (
                <li key={s}>
                  <button
                    className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-gray-200 hover:bg-white/5 transition-colors flex items-center gap-2.5"
                    onMouseDown={() => submit(s)}
                  >
                    {/* Anti-spoiler: name only */}
                    <span className="text-gray-500 text-xs">👤</span>
                    <span>{s}</span>
                  </button>
                </li>
              ))}
              <li className="px-3 py-1.5 text-xs text-gray-600 border-t mt-1" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                Nur Namen – keine Vereinshinweise
              </li>
            </motion.ul>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Progress bar under search field */}
      <div className="mt-2.5 flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #16A34A, #2bd46a)', boxShadow: '0 0 10px rgba(34,197,94,0.5)' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <span className="text-xs text-gray-500 tabular-nums flex-shrink-0">
          {solvedCount}/{totalCount}
        </span>
      </div>
    </div>
  );
}
