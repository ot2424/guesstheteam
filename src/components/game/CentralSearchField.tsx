import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MOCK_SEARCH_PLAYERS } from '../../data/mockTeams';
import { normalizeStr } from '../../utils/playerMatching';

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

  const handleInput = useCallback((val: string) => {
    setInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (val.length >= 2) {
        // Anti-spoiler: only show name, no club/league info
        const matches = MOCK_SEARCH_PLAYERS
          .filter(n => normalizeStr(n).includes(normalizeStr(val)))
          .slice(0, 7);
        setSuggestions(matches);
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
              : focused
              ? '#1F2937'
              : '#111827',
            borderColor: flash === 'green'
              ? '#22C55E'
              : flash === 'red'
              ? '#EF4444'
              : focused
              ? '#4B5563'
              : '#374151',
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
            className="flex-shrink-0 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-30"
            style={{ background: '#22C55E', color: '#0A0E1A' }}
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
              className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-gray-700 overflow-hidden shadow-xl"
              style={{ background: '#1F2937' }}
            >
              {suggestions.map((s) => (
                <li key={s}>
                  <button
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-200 hover:bg-gray-700 transition-colors flex items-center gap-2"
                    onMouseDown={() => submit(s)}
                  >
                    {/* Anti-spoiler: name only */}
                    <span className="text-gray-400 text-xs">👤</span>
                    <span>{s}</span>
                  </button>
                </li>
              ))}
              <li className="px-4 py-1.5 text-xs text-gray-600 border-t border-gray-800">
                Nur Namen – keine Vereinshinweise
              </li>
            </motion.ul>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Progress bar under search field */}
      <div className="mt-2.5 flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-gray-800 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #16A34A, #22C55E)' }}
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
