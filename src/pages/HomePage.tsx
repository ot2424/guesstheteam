import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AmbientPreview } from '../components/GameplayPreview';
import { useAuth } from '../lib/useAuth';
import { RankBadge } from '../components/ui/RankBadge';
import { XPBar } from '../components/ui/XPBar';
import { getProfile } from '../lib/api';
import { RANKED_UNLOCK_LEVEL, WORLD_CUP_UNLOCK_LEVEL } from '../lib/progression';
import { getPrestigeVisual, getUnlockedRewards } from '../lib/rewards';
import { clearSavedGame, getSavedGameUrl, loadSavedGame, type SavedGame } from '../lib/savedGame';
import type { UserProfile } from '../types';

// ============================================================================
//  HomePage.tsx — Landing (nicht eingeloggt)
//  Drei Bereiche: 1) Hero mit Rate-Animation  2) interaktiver Karriere-Verlauf
//  3) animierte Rang-Leiter bis Platin (ohne erforderliche LP).
//
//  Voraussetzung: src/components/GameplayPreview.tsx (bereits geliefert).
//  Schriften (Anton / Inter / JetBrains Mono) idealerweise in index.html laden.
// ============================================================================

type CSS = React.CSSProperties;

// ── Daten ───────────────────────────────────────────────────────────────────
const CLUB_LOGOS: Record<string, string> = {
  'Hertha BSC': 'https://commons.wikimedia.org/wiki/Special:FilePath/Hertha_BSC_Logo_2012.svg?width=240',
  'Hamburger SV': 'https://commons.wikimedia.org/wiki/Special:FilePath/Hamburger_SV_logo.svg?width=240',
  'Manchester City': 'https://r2.thesportsdb.com/images/media/team/badge/vwpvry1467462651.png',
  'Bayern Munich': 'https://r2.thesportsdb.com/images/media/team/badge/01ogkh1716960412.png',
  'Bayern (Leihe)': 'https://r2.thesportsdb.com/images/media/team/badge/01ogkh1716960412.png',
  'FC Barcelona': 'https://r2.thesportsdb.com/images/media/team/badge/wq9sir1639406443.png',
  'Liverpool': 'https://r2.thesportsdb.com/images/media/team/badge/kfaher1737969724.png',
  'Real Madrid': 'https://r2.thesportsdb.com/images/media/team/badge/vwvwrw1473502969.png',
  'FC Porto': 'https://r2.thesportsdb.com/images/media/team/badge/xtwwxr1448811230.png',
  'AS Monaco': 'https://r2.thesportsdb.com/images/media/team/badge/uysxvw1467036426.png',
};

interface Club { ini: string; col: string; name: string; years: string; tag?: string; current?: boolean; }
interface DemoPlayer { id: string; flags: string; posLabel: string; posColor: string; meta: string; answer: string; clubs: Club[]; }

const PLAYERS: DemoPlayer[] = [
  {
    id: 'boateng', flags: '🇩🇪🇬🇭', posLabel: 'VERTEIDIGER', posColor: '#5a8cff',
    meta: 'Deutschland / Ghana · Verteidiger', answer: 'Jérôme Boateng',
    clubs: [
      { ini: 'H', col: '#1c4fb0', name: 'Hertha BSC', years: '2002–2007', tag: 'Jugend' },
      { ini: 'HSV', col: '#1668c4', name: 'Hamburger SV', years: '2007–2010' },
      { ini: 'MC', col: '#6cabdd', name: 'Manchester City', years: '2010–2011' },
      { ini: 'FCB', col: '#dc0511', name: 'Bayern Munich', years: '2011–2021', current: true },
    ],
  },
  {
    id: 'thiago', flags: '🇪🇸🇮🇹', posLabel: 'MITTELFELD', posColor: '#b06bf5',
    meta: 'Spanien / Italien · Mittelfeld', answer: 'Thiago Alcántara',
    clubs: [
      { ini: 'FCB', col: '#a50044', name: 'FC Barcelona', years: '2009–2013', tag: 'Jugend→Profi' },
      { ini: 'FCB', col: '#dc0511', name: 'Bayern Munich', years: '2013–2020' },
      { ini: 'LFC', col: '#c8102e', name: 'Liverpool', years: '2020–2024', current: true },
    ],
  },
  {
    id: 'james', flags: '🇨🇴', posLabel: 'MITTELFELD', posColor: '#b06bf5',
    meta: 'Kolumbien · Mittelfeld', answer: 'James Rodríguez',
    clubs: [
      { ini: 'POR', col: '#1e3a8a', name: 'FC Porto', years: '2010–2013' },
      { ini: 'ASM', col: '#ce1126', name: 'AS Monaco', years: '2013–2014' },
      { ini: 'RM', col: '#c9a227', name: 'Real Madrid', years: '2014–2020' },
      { ini: 'FCB', col: '#dc0511', name: 'Bayern (Leihe)', years: '2017–2019', tag: 'Leihe', current: true },
    ],
  },
];

const RANKS = [
  { name: 'Bronze', col: '#cd7f32', g1: '#7a4419', g2: '#cd7f32', glow: 'rgba(205,127,50,0.6)', ini: 'BRZ' },
  { name: 'Silber', col: '#c2cbd6', g1: '#7c8595', g2: '#c2cbd6', glow: 'rgba(194,203,214,0.55)', ini: 'SLB' },
  { name: 'Gold', col: '#f5d142', g1: '#b8901f', g2: '#f5d142', glow: 'rgba(245,209,66,0.6)', ini: 'GLD' },
  { name: 'Platin', col: '#67d6c9', g1: '#2e8c83', g2: '#67d6c9', glow: 'rgba(103,214,201,0.6)', ini: 'PLT' },
];
// 12 Divisionen: Bronze 3-2-1, Silber 3-2-1, Gold 3-2-1, Platin 3-2-1
const STEPS: { rank: number; div: number }[] = [];
for (let r = 0; r < RANKS.length; r++) for (let d = 0; d < 3; d++) STEPS.push({ rank: r, div: 3 - d });

// ── Reveal-Hook (Scroll-Einblendung) ────────────────────────────────────────
function useReveal<T extends HTMLElement>(delay = 0) {
  const [node, setNode] = useState<T | null>(null);
  const [shown, setShown] = useState(false);
  const ref = useCallback((element: T | null) => {
    setNode(element);
  }, []);

  useEffect(() => {
    const el = node;
    if (!el) return;
    // Fallback: falls IntersectionObserver fehlt/nicht feuert, trotzdem anzeigen
    if (typeof IntersectionObserver === 'undefined') {
      const fallback = window.setTimeout(() => setShown(true), 0);
      return () => window.clearTimeout(fallback);
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { setShown(true); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    io.observe(el);
    const safety = window.setTimeout(() => setShown(true), 1200);
    return () => { io.disconnect(); window.clearTimeout(safety); };
  }, [node]);
  const style: CSS = {
    opacity: shown ? 1 : 0,
    transform: shown ? 'none' : 'translateY(24px)',
    transition: `opacity .65s cubic-bezier(.16,.84,.34,1) ${delay}ms, transform .65s cubic-bezier(.16,.84,.34,1) ${delay}ms`,
  };
  return [ref, style] as const;
}

const Jersey = ({ size = 30 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <path d="M19 5.5 L29 5.5 L42 12.6 L36.4 22.1 L32.5 19.8 L32.5 42.5 L15.5 42.5 L15.5 19.8 L11.6 22.1 L6 12.6 Z" fill="#22c55e" stroke="rgba(0,0,0,0.18)" strokeWidth="1" strokeLinejoin="round" />
    <path d="M19 5.5 Q24 11.8 29 5.5" fill="none" stroke="rgba(0,0,0,0.28)" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

// ── Karriere-Verlauf (interaktiv) ────────────────────────────────────────────
function CareerSection() {
  const [headRef, headStyle] = useReveal<HTMLDivElement>(0);
  const [bodyRef, bodyStyle] = useReveal<HTMLDivElement>(120);
  const [selectedId, setSelectedId] = useState('boateng');
  const sel = PLAYERS.find((p) => p.id === selectedId) ?? PLAYERS[0];

  return (
    <section style={{ position: 'relative', zIndex: 3, background: 'linear-gradient(180deg,#080c13,#0a0e16)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '96px 32px' }}>
        <div ref={headRef} style={{ ...headStyle, textAlign: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 13, letterSpacing: '0.26em', color: '#5a8cff', marginBottom: 14 }}>DER HINWEIS</div>
          <h2 style={{ fontFamily: 'Anton, sans-serif', fontSize: 'clamp(40px,5vw,62px)', lineHeight: 0.98, margin: '0 0 14px', color: '#fff' }}>Klick einen Spieler — lies die Karriere</h2>
          <p style={{ fontSize: 17, color: '#9aa4b2', maxWidth: 560, margin: '0 auto' }}>Kein Name — erkenne das Muster der Vereine und du hast ihn.</p>
        </div>

        <div ref={bodyRef} style={{ ...bodyStyle, display: 'grid', gridTemplateColumns: 'minmax(0,300px) 1fr', gap: 26, marginTop: 42 }} className="gtt-career-grid">
          {/* Spieler-Auswahl */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 12, letterSpacing: '0.2em', color: '#59626f', marginBottom: 2 }}>WÄHLE EINEN SPIELER</div>
            {PLAYERS.map((p) => {
              const active = p.id === selectedId;
              return (
                <button key={p.id} onClick={() => setSelectedId(p.id)} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 13, padding: '15px 16px', borderRadius: 15, border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg,#0e141d,#0a0e16)', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'border-color .2s, transform .15s' }}>
                  {active && <div style={{ position: 'absolute', inset: 0, borderRadius: 15, border: '1.5px solid #22c55e', boxShadow: '0 0 22px rgba(34,197,94,0.28)', pointerEvents: 'none' }} />}
                  <div style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>{p.flags}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 11, letterSpacing: '0.04em', border: `1px solid ${p.posColor}`, color: p.posColor, borderRadius: 5, padding: '2px 7px', display: 'inline-block', lineHeight: 1 }}>{p.posLabel}</div>
                    <div style={{ fontSize: 13, color: '#8b95a5', marginTop: 6 }}>{p.clubs.length} Stationen</div>
                  </div>
                  <div style={{ color: active ? '#22c55e' : '#59626f', fontSize: 17 }}>›</div>
                </button>
              );
            })}
          </div>

          {/* Karriere-Karte */}
          <div style={{ background: 'rgba(12,17,25,0.96)', border: '1px solid rgba(255,255,255,0.13)', borderRadius: 20, boxShadow: '0 28px 70px rgba(0,0,0,0.55)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontSize: 26 }}>{sel.flags}</div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: 17, color: '#5a8cff' }}>💡 Karriere-Tipp</div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#94a0b0', marginLeft: 2 }}>{sel.meta}</div>
              <div style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, color: '#59626f' }}>{sel.clubs.length} Vereine</div>
            </div>
            <div style={{ padding: '18px 24px 8px' }}>
              {sel.clubs.map((c, i) => (
                <div key={`${sel.id}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '9px 0', animation: 'gttRow .45s both', animationDelay: `${i * 0.08}s` }}>
                  <div style={{ position: 'relative', width: 14, display: 'flex', justifyContent: 'center', alignSelf: 'stretch', alignItems: 'center' }}>
                    <div style={{ position: 'absolute', top: -9, bottom: -9, width: 2, background: 'rgba(255,255,255,0.12)' }} />
                    <div style={{ width: 11, height: 11, borderRadius: '50%', background: c.current ? '#22c55e' : 'transparent', border: c.current ? 'none' : '1.5px solid #59626f', boxShadow: c.current ? '0 0 10px #22c55e' : 'none', zIndex: 1 }} />
                  </div>
                  <div style={{ position: 'relative', width: 38, height: 38, borderRadius: 9, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Anton, sans-serif', fontSize: 11, color: '#cfd6e0', flexShrink: 0, overflow: 'hidden', boxShadow: '0 0 0 1px rgba(255,255,255,0.08)' }}>
                    {c.ini}
                    {CLUB_LOGOS[c.name] && (
                      <img src={CLUB_LOGOS[c.name]} alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} />
                    )}
                  </div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 15.5, color: '#f3f6fa' }}>{c.name}</div>
                  {c.tag && <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, letterSpacing: '0.05em', color: '#94a0b0', background: 'rgba(255,255,255,0.07)', padding: '3px 8px', borderRadius: 5 }}>{c.tag}</div>}
                  <div style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, color: '#59626f' }}>{c.years}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '14px 24px 20px' }}>
              <div style={{ flex: 1, height: 46, borderRadius: 12, background: '#0a0e16', border: '1px solid rgba(34,197,94,0.55)', boxShadow: '0 0 0 3px rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px' }}>
                <span style={{ fontSize: 15 }}>⚽</span>
                <span style={{ fontSize: 14.5, color: '#22c55e', fontWeight: 700 }}>{sel.answer}</span>
                <span style={{ marginLeft: 'auto', color: '#2bd46a', fontWeight: 800 }}>✓ Gelöst</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Aufstieg bis Platin (animiert, OHNE erforderliche LP) ────────────────────
function RankSection() {
  const [headRef, headStyle] = useReveal<HTMLDivElement>(0);
  const [bodyRef, bodyStyle] = useReveal<HTMLDivElement>(120);
  const [stepIdx, setStepIdx] = useState(0);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    let raf = 0;
    let start: number | null = null;
    const FILL = 0.4, PAUSE = 0.45, TOTAL = STEPS.length * FILL + PAUSE;
    const frame = (now: number) => {
      if (start == null) start = now;
      const el = ((now - start) / 1000) % TOTAL;
      let si: number, p: number;
      if (el < STEPS.length * FILL) { si = Math.floor(el / FILL); p = (el % FILL) / FILL * 100; }
      else { si = STEPS.length - 1; p = 100; }
      setStepIdx(si);
      setPct(p);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const step = STEPS[stepIdx];
  const t = RANKS[step.rank];
  const nextStep = STEPS[stepIdx + 1];
  const nextLabel = nextStep ? `→ ${RANKS[nextStep.rank].name} ${nextStep.div}` : 'Maximaler Rang';

  return (
    <section style={{ position: 'relative', zIndex: 3, background: 'radial-gradient(80% 90% at 50% 0%, #0d1622, #06090f)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '96px 32px' }}>
        <div ref={headRef} style={{ ...headStyle, textAlign: 'center', marginBottom: 54 }}>
          <div style={{ fontSize: 13, letterSpacing: '0.26em', color: '#22c55e', marginBottom: 14 }}>RANKED</div>
          <h2 style={{ fontFamily: 'Anton, sans-serif', fontSize: 'clamp(40px,5vw,62px)', lineHeight: 0.98, margin: '0 0 14px', color: '#fff' }}>Sammle LP — steig auf bis Platin</h2>
          <p style={{ fontSize: 17, color: '#9aa4b2', maxWidth: 560, margin: '0 auto' }}>Jedes gelöste Team bringt LP. Fülle die Leiste, klettere durch die Ränge.</p>
        </div>

        <div ref={bodyRef} style={bodyStyle}>
          {/* Rang-Badges */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 30 }}>
            {RANKS.map((tt, i) => (
              <div key={tt.ini} style={{ display: 'contents' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, transition: 'opacity .4s', opacity: i <= step.rank ? 1 : 0.55 }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: i <= step.rank ? '#0c1018' : '#0e141d',
                    border: `1px solid ${i <= step.rank ? tt.col : 'rgba(255,255,255,0.1)'}`,
                    boxShadow: i === step.rank ? `0 0 24px ${tt.glow}` : 'none',
                    transform: i === step.rank ? 'scale(1.08)' : 'scale(1)',
                    transition: 'all .4s',
                  }}>
                    <span style={{ fontFamily: 'Anton, sans-serif', fontSize: 15, color: tt.col }}>{tt.ini}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#8b95a5' }}>{tt.name}</span>
                </div>
                {i < RANKS.length - 1 && <div style={{ height: 2, flex: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 26 }} />}
              </div>
            ))}
          </div>

          {/* LP-Leiste — ohne erforderliche LP */}
          <div style={{ background: 'rgba(13,18,26,0.9)', border: '1px solid rgba(255,255,255,0.13)', borderRadius: 18, padding: '24px 26px', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <span style={{ fontFamily: 'Anton, sans-serif', fontSize: 28, color: '#fff' }}>{t.name.toUpperCase()} {step.div}</span>
                <span style={{ fontSize: 14, color: '#8b95a5' }}>{nextLabel}</span>
              </div>
            </div>
            <div style={{ height: 18, borderRadius: 10, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div style={{ width: `${pct}%`, height: '100%', borderRadius: 10, background: `linear-gradient(90deg,${t.g1},${t.g2})`, boxShadow: `0 0 16px ${t.glow}` }} />
            </div>
            <div style={{ marginTop: 14, fontSize: 14.5, color: '#9aa4b2' }}>Sieg: <span style={{ color: '#2bd46a', fontWeight: 700 }}>+14 bis +18 LP</span> · Siegesserie gibt Bonus-LP.</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Seite ────────────────────────────────────────────────────────────────────
export function HomePage() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Dashboard /> : <Landing />;
}

// ── Landing (nicht eingeloggt) ──────────────────────────────────
function Landing() {
  const navigate = useNavigate();
  const [ctaRef, ctaStyle] = useReveal<HTMLDivElement>(0);

  return (
    <div style={{ position: 'relative', width: '100%', background: '#06090f', color: '#f3f6fa', fontFamily: 'Inter, system-ui, sans-serif', overflowX: 'hidden' }}>
      <style>{`
        @keyframes gttScrollDot { 0% { transform: translateY(0); opacity: 0; } 35% { opacity: 1; } 70% { transform: translateY(13px); opacity: 0; } 100% { opacity: 0; } }
        @keyframes gttPulse { 0%,100% { box-shadow: 0 14px 34px rgba(34,197,94,0.4), 0 0 0 0 rgba(34,197,94,0.5); } 50% { box-shadow: 0 14px 34px rgba(34,197,94,0.4), 0 0 0 14px rgba(34,197,94,0); } }
        @keyframes gttRow { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: none; } }
        @keyframes gttHeroIn { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
        @media (max-width: 760px) { .gtt-career-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      {/* NAV — entfernt: die globale <Navbar> der App rendert die Navigation.
          (Doppelte Navigation würde sich oben überlagern.) */}

      {/* 1 · HERO */}
      <header style={{ position: 'relative', minHeight: '92vh', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <AmbientPreview />
        </div>
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'linear-gradient(90deg, rgba(6,9,15,0.94) 0%, rgba(6,9,15,0.74) 36%, rgba(6,9,15,0.30) 66%, rgba(6,9,15,0.55) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'linear-gradient(180deg, rgba(6,9,15,0.55) 0%, transparent 26%, transparent 60%, #06090f 100%)' }} />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 1200, margin: '0 auto', padding: '120px 32px 90px', width: '100%' }}>
          <div style={{ maxWidth: 680 }}>
            <div style={{ opacity: 0, animation: 'gttHeroIn .7s cubic-bezier(.16,.84,.34,1) .05s both', display: 'inline-flex', alignItems: 'center', gap: 9, padding: '8px 16px', borderRadius: 999, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.35)', marginBottom: 24 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 10px #22c55e' }} />
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.22em', color: '#7ee2a8' }}>DAS FUSSBALL-RÄTSEL</span>
            </div>
            <h1 style={{ opacity: 0, animation: 'gttHeroIn .7s cubic-bezier(.16,.84,.34,1) .13s both', fontFamily: 'Anton, sans-serif', fontSize: 'clamp(64px,9vw,124px)', lineHeight: 0.86, letterSpacing: '0.005em', margin: '0 0 22px', color: '#fff', textShadow: '0 8px 60px rgba(0,0,0,0.75)' }}>
              ERKENNE<br />DIE <span style={{ color: '#22c55e', textShadow: '0 0 70px rgba(34,197,94,0.55)' }}>ELF</span>
            </h1>
            <p style={{ opacity: 0, animation: 'gttHeroIn .7s cubic-bezier(.16,.84,.34,1) .21s both', fontSize: 20, lineHeight: 1.6, color: '#aeb7c4', maxWidth: 520, margin: '0 0 34px' }}>Errate komplette Mannschaften — nur aus Position, Nationalität und Karriere. Ein Spieler nach dem anderen.</p>
            <div style={{ opacity: 0, animation: 'gttHeroIn .7s cubic-bezier(.16,.84,.34,1) .29s both' }}>
              <button onClick={() => navigate('/auth')} style={{ display: 'inline-flex', alignItems: 'center', gap: 11, background: '#22c55e', border: 'none', color: '#04130a', fontFamily: 'inherit', fontWeight: 800, fontSize: 17, padding: '18px 34px', borderRadius: 13, cursor: 'pointer', animation: 'gttPulse 2.8s ease-out infinite' }}>Jetzt kostenlos spielen <span style={{ fontSize: 18 }}>→</span></button>
            </div>
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, letterSpacing: '0.28em', color: '#5e6776' }}>MEHR ENTDECKEN</span>
          <div style={{ width: 24, height: 38, border: '2px solid rgba(255,255,255,0.22)', borderRadius: 13, display: 'flex', justifyContent: 'center', paddingTop: 7 }}>
            <div style={{ width: 4, height: 8, borderRadius: 2, background: '#22c55e', animation: 'gttScrollDot 1.7s ease-in-out infinite' }} />
          </div>
        </div>
      </header>

      {/* 2 · KARRIERE */}
      <CareerSection />

      {/* 3 · AUFSTIEG */}
      <RankSection />

      {/* FINAL CTA */}
      <section style={{ position: 'relative', zIndex: 3, padding: '96px 32px 110px', textAlign: 'center', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(60% 70% at 50% 45%, rgba(34,197,94,0.16), transparent 70%)' }} />
        <div ref={ctaRef} style={{ ...ctaStyle, position: 'relative' }}>
          <h2 style={{ fontFamily: 'Anton, sans-serif', fontSize: 'clamp(48px,7vw,86px)', lineHeight: 0.92, margin: '0 0 18px', color: '#fff' }}>Bereit, die Elf<br />zu knacken?</h2>
          <p style={{ fontSize: 19, color: '#9aa4b2', margin: '0 auto 34px', maxWidth: 500 }}>Kostenlos. Sofort spielbar.</p>
          <button onClick={() => navigate('/auth')} style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: '#22c55e', border: 'none', color: '#04130a', fontFamily: 'inherit', fontWeight: 800, fontSize: 19, padding: '21px 44px', borderRadius: 14, cursor: 'pointer', animation: 'gttPulse 2.8s ease-out infinite' }}>Jetzt kostenlos registrieren <span style={{ fontSize: 20 }}>→</span></button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ position: 'relative', zIndex: 3, borderTop: '1px solid rgba(255,255,255,0.06)', padding: '30px 32px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', background: '#080c13' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Jersey size={26} />
          <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: '0.12em', color: '#cfd6e0' }}>GUESSTHETEAM</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 24, fontSize: 14, color: '#7b8595' }}>
          <span>Freizeit</span><span>Ranked</span><span>Rangliste</span><span>Impressum</span>
        </div>
      </footer>
    </div>
  );
}

// ── Dashboard (eingeloggt) ───────────────────────────────────────────────────
const DIFFICULTIES = [
  { id: 'easy', label: 'Leicht', dot: '#22c55e', desc: 'Feste Liga · moderne Top-Teams · 2018–2026', xp: 'Nur XP' },
  { id: 'medium', label: 'Mittel', dot: '#f59e0b', desc: 'Ligen-Mix · etablierte Euro-Clubs · 2010–2026', xp: 'Nur XP' },
  { id: 'hard', label: 'Schwer', dot: '#ef4444', desc: 'Ligen-Mix · historische Nostalgie-Teams · 2000–2015', xp: 'Nur XP' },
] as const;

const MATCH_TYPES = [
  { id: 'single', label: 'Einzel-Match', desc: '1 Team · alle 11 Spieler erraten', lp: '+/- LP', n: '1' },
  { id: 'series', label: '3er-Match Serie', desc: '3 Teams · mindestens 2 von 3 lösen', lp: 'LP x1.5', n: '3' },
] as const;

function getRankedDifficultyLabel(rank: string) {
  if (rank.startsWith('Bronze')) return 'Leicht';
  if (rank.startsWith('Silver') || rank.startsWith('Silber')) return 'Mittel';
  return 'Schwer / Nostalgie';
}

const cardStyle: CSS = { background: 'linear-gradient(180deg,#0e141d,#0a0e16)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, overflow: 'hidden' };
const rowStyle: CSS = { display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px', borderRadius: 13, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', width: '100%', transition: 'border-color .2s, background .2s' };

function Dashboard() {
  const navigate = useNavigate();
  const { displayName, user } = useAuth();
  const [savedGame, setSavedGame] = useState<SavedGame | null>(() => loadSavedGame());
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const name = profile?.username || displayName || user?.email?.split('@')[0] || 'Spieler';
  const dashboardUser: UserProfile = profile ?? {
    id: user?.email ?? 'local-user',
    username: name,
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
    xp: 0,
    level: 1,
    lp: 0,
    rank: 'Bronze 3',
    badges: [],
    matchesPlayed: 0,
    matchesWon: 0,
    winStreak: 0,
    bestWinStreak: 0,
    inventory: {
      skipShields: 0,
      autoSolveJokers: 0,
    },
    unlockedRewards: getUnlockedRewards(1),
    prestige: getPrestigeVisual('Bronze 3'),
  };
  const isRankedUnlocked = dashboardUser.level >= RANKED_UNLOCK_LEVEL;
  const isWorldCupUnlocked = dashboardUser.level >= WORLD_CUP_UNLOCK_LEVEL;

  useEffect(() => {
    let active = true;
    getProfile()
      .then((response) => {
        if (active) setProfile(response.profile);
      })
      .catch(() => {
        if (active) setProfile(null);
      })
      .finally(() => {
        if (active) setProfileLoading(false);
      });

    return () => { active = false; };
  }, []);

  const startNewGame = (url: string) => {
    clearSavedGame();
    setSavedGame(null);
    navigate(url);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#06090f', color: '#f3f6fa', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        @keyframes gttHeroIn { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
        .gtt-dash-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
        @media (max-width: 760px) { .gtt-dash-grid { grid-template-columns: 1fr !important; } }
        .gtt-row:hover { border-color: rgba(34,197,94,0.5) !important; background: rgba(34,197,94,0.06) !important; }
      `}</style>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '48px 24px 90px' }}>
        {/* Begrüßung */}
        <div style={{ animation: 'gttHeroIn .5s ease both', marginBottom: 28 }}>
          <div style={{ fontSize: 13, letterSpacing: '0.24em', color: '#22c55e', marginBottom: 10 }}>STARTSEITE</div>
          <h1 style={{ fontFamily: 'Anton, sans-serif', fontSize: 'clamp(40px,6vw,68px)', lineHeight: 0.92, margin: 0, color: '#fff' }}>
            Willkommen zurück, {name}
          </h1>
          <p style={{ fontSize: 16.5, color: '#9aa4b2', maxWidth: 540, margin: '14px 0 0' }}>
            Erkenne Fußballer an Karriere und Nationalität. Steige auf, sammle Ränge, schalte Inhalte frei.
          </p>
        </div>

        {/* Stats-Leiste */}
        <div style={{ ...cardStyle, borderRadius: 16, padding: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 18, marginBottom: 22, animation: 'gttHeroIn .5s ease .06s both' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', border: '1px solid #15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7ee2a8', fontWeight: 800, fontSize: 17 }}>{name[0]?.toUpperCase()}</div>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: '#fff' }}>{name}</div>
              <div style={{ fontSize: 12.5, color: '#59626f' }}>
                {profileLoading ? 'Profil wird geladen...' : `${dashboardUser.matchesPlayed} Matches · ${dashboardUser.winStreak}🔥 Serie`}
              </div>
            </div>
          </div>
          <RankBadge rank={dashboardUser.rank} />
          <div style={{ flex: 1, minWidth: 180 }}>
            <XPBar xp={dashboardUser.xp} level={dashboardUser.level} />
          </div>
        </div>

        {/* Tutorial */}
        <button onClick={() => navigate('/tutorial')} className="gtt-row" style={{ ...rowStyle, padding: '16px 18px', borderStyle: 'dashed', borderColor: 'rgba(34,197,94,0.45)', background: 'rgba(34,197,94,0.05)', marginBottom: 14, animation: 'gttHeroIn .5s ease .1s both' }}>
          <span style={{ fontSize: 26 }}>🎓</span>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#2bd46a', fontWeight: 700, fontSize: 15 }}>Tutorial spielen</div>
            <div style={{ fontSize: 12.5, color: '#8b95a5' }}>Lerne das Spielprinzip mit Real Madrid 2022/23 · Kein XP/LP-Einfluss</div>
          </div>
          <span style={{ color: '#59626f', fontSize: 18 }}>→</span>
        </button>

        {/* Spiel fortsetzen */}
        {savedGame && (
          <button onClick={() => navigate(getSavedGameUrl(savedGame))} className="gtt-row" style={{ ...rowStyle, padding: '16px 18px', borderColor: 'rgba(34,197,94,0.6)', background: 'rgba(34,197,94,0.09)', marginBottom: 14 }}>
            <span style={{ fontSize: 22, color: '#2bd46a' }}>▶</span>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#7ee2a8', fontWeight: 700, fontSize: 15 }}>Spiel fortsetzen</div>
              <div style={{ fontSize: 12.5, color: '#8b95a5' }}>
                {savedGame.team.name} · {savedGame.team.season} · {Object.values(savedGame.guesses).filter((g) => g.solved).length}/{savedGame.team.players.length}
              </div>
            </div>
            <span style={{ color: '#59626f', fontSize: 18 }}>→</span>
          </button>
        )}

        {/* Modi */}
        <div className="gtt-dash-grid" style={{ marginTop: 8, animation: 'gttHeroIn .5s ease .14s both' }}>
          {/* Freizeit */}
          <div style={cardStyle}>
            <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 19, letterSpacing: '0.04em', color: '#fff' }}>FREIZEIT-MODUS</div>
              <div style={{ fontSize: 12.5, color: '#8b95a5', marginTop: 3 }}>Solo ohne Rang · XP-Gewinn · kein LP-Verlust</div>
            </div>
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 9 }}>
              {DIFFICULTIES.map((d) => (
                <button key={d.id} onClick={() => startNewGame(`/play?playMode=casual&matchType=single&difficulty=${d.id}&leagueId=L1`)} className="gtt-row" style={rowStyle}>
                  <span style={{ width: 11, height: 11, borderRadius: '50%', background: d.dot, boxShadow: `0 0 9px ${d.dot}`, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 600, color: '#fff' }}>{d.label}</div>
                    <div style={{ fontSize: 12, color: '#8b95a5' }}>{d.desc}</div>
                  </div>
                  <span style={{ fontSize: 12, color: '#8b95a5', fontFamily: 'JetBrains Mono, monospace' }}>{d.xp}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Ranked */}
          <div style={cardStyle}>
            <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 19, letterSpacing: '0.04em', color: '#fff' }}>SOLO-RANGLISTE</div>
              <span style={{ marginLeft: 'auto', fontSize: 11.5, padding: '3px 10px', borderRadius: 999, background: isRankedUnlocked ? 'rgba(245,166,35,0.14)' : 'rgba(148,163,184,0.12)', color: isRankedUnlocked ? '#f5a623' : '#94a3b8', border: `1px solid ${isRankedUnlocked ? 'rgba(245,166,35,0.4)' : 'rgba(148,163,184,0.24)'}` }}>
                {isRankedUnlocked ? getRankedDifficultyLabel(dashboardUser.rank) : `Ab Level ${RANKED_UNLOCK_LEVEL}`}
              </span>
            </div>
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 12.5, color: '#8b95a5', margin: '0 2px 2px' }}>
                {isRankedUnlocked
                  ? 'Deine Schwierigkeit wird automatisch aus deinem Rang bestimmt. Siege und Niederlagen verändern LP und XP.'
                  : `Spiele Freizeit oder Tutorial, bis du Level ${RANKED_UNLOCK_LEVEL} erreichst. Danach wird Ranked freigeschaltet.`}
              </p>
              {MATCH_TYPES.map((m) => (
                <button
                  key={m.id}
                  disabled={!isRankedUnlocked || profileLoading}
                  onClick={() => startNewGame(`/play?playMode=ranked&matchType=${m.id}&rank=${encodeURIComponent(dashboardUser.rank)}`)}
                  className="gtt-row"
                  style={{
                    ...rowStyle,
                    cursor: isRankedUnlocked && !profileLoading ? 'pointer' : 'not-allowed',
                    opacity: isRankedUnlocked && !profileLoading ? 1 : 0.55,
                  }}
                >
                  <span style={{ fontFamily: 'Anton, sans-serif', fontSize: 18, color: '#2bd46a', width: 20, textAlign: 'center', flexShrink: 0 }}>{m.n}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 600, color: '#fff' }}>{m.label}</div>
                    <div style={{ fontSize: 12, color: '#8b95a5' }}>{m.desc}</div>
                  </div>
                  <span style={{ fontSize: 12, color: '#2bd46a', fontFamily: 'JetBrains Mono, monospace' }}>{m.lp}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ ...cardStyle, marginTop: 18, animation: 'gttHeroIn .5s ease .18s both' }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 19, letterSpacing: '0.04em', color: '#fff' }}>WM-MODUS</div>
            <span style={{ marginLeft: 'auto', fontSize: 11.5, padding: '3px 10px', borderRadius: 999, background: isWorldCupUnlocked ? 'rgba(34,197,94,0.12)' : 'rgba(148,163,184,0.12)', color: isWorldCupUnlocked ? '#2bd46a' : '#94a3b8', border: `1px solid ${isWorldCupUnlocked ? 'rgba(34,197,94,0.35)' : 'rgba(148,163,184,0.24)'}` }}>
              {isWorldCupUnlocked ? 'Freigeschaltet' : `Ab Level ${WORLD_CUP_UNLOCK_LEVEL}`}
            </span>
          </div>
          <div style={{ padding: 14 }}>
            <button
              disabled={!isWorldCupUnlocked || profileLoading}
              onClick={() => startNewGame('/play?playMode=worldcup&matchType=single&difficulty=medium')}
              className="gtt-row"
              style={{
                ...rowStyle,
                cursor: isWorldCupUnlocked && !profileLoading ? 'pointer' : 'not-allowed',
                opacity: isWorldCupUnlocked && !profileLoading ? 1 : 0.55,
              }}
            >
              <span style={{ fontSize: 24, flexShrink: 0 }}>🏆</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: '#fff' }}>Nationalteam erraten</div>
                <div style={{ fontSize: 12, color: '#8b95a5' }}>
                  Keine Nationalitäten als Hinweis · Land und aktuelle Vereine helfen dir.
                </div>
              </div>
              <span style={{ fontSize: 12, color: '#2bd46a', fontFamily: 'JetBrains Mono, monospace' }}>XP</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
