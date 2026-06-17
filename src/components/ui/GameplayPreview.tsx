// ============================================================================
//  GameplayPreview.tsx
//  Selbstständige, geloopte Gameplay-Vorschau für die GuessTheTeam-Startseite.
//  Drop-in: legt diese Datei nach  src/components/GameplayPreview.tsx
//
//  Einbau in HomePage.tsx (Gast-/nicht-eingeloggt-Ansicht), ersetzt das <img>:
//
//      import { GameplayPreview } from '../components/GameplayPreview';
//      ...
//      <GameplayPreview />        // statt: <img src={heroImage} className="h-72 ..." />
//
//  Es braucht KEINE externen Pakete. Die Schriften Anton / Inter / JetBrains Mono
//  werden über fontFamily referenziert; sind sie nicht geladen, fällt es sauber
//  auf sans-serif zurück. Optional im <head> bzw. index.html ergänzen:
//   <link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet" />
// ============================================================================

import React, { useEffect, useRef, useState } from 'react';

type CSS = React.CSSProperties;

// ── kleine Animations-Runtime (ersetzt die Engine) ─────────────────────────
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

const Easing = {
  easeInOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  easeOutBack: (t: number) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

function interpolate(inputs: number[], outputs: number[], easing?: (t: number) => number) {
  return (t: number): number => {
    if (t <= inputs[0]) return outputs[0];
    if (t >= inputs[inputs.length - 1]) return outputs[outputs.length - 1];
    let i = 0;
    while (t > inputs[i + 1]) i++;
    const span = inputs[i + 1] - inputs[i];
    let f = span === 0 ? 0 : (t - inputs[i]) / span;
    if (easing) f = easing(f);
    return outputs[i] + (outputs[i + 1] - outputs[i]) * f;
  };
}

function useLoopTime(duration: number): number {
  const [t, setT] = useState(0);
  const start = useRef<number | null>(null);
  useEffect(() => {
    let raf = 0;
    const tick = (now: number) => {
      if (start.current == null) start.current = now;
      setT(((now - start.current) / 1000) % duration);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [duration]);
  return t;
}

// Skaliert die 1280×720-Bühne verlustfrei auf die Containerbreite (16:9).
function ScaleStage({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / 1280);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', overflow: 'hidden', background: '#0a0e16' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: 1280, height: 720, transformOrigin: 'top left', transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}

// ── Design-Tokens ──────────────────────────────────────────────────────────
const C = {
  bg: '#0a0e16', panel: '#11161f', panel2: '#161d29',
  line: 'rgba(255,255,255,0.07)', line2: 'rgba(255,255,255,0.13)',
  green: '#22c55e', greenBright: '#2bd46a', greenDim: '#1c9b50',
  text: '#f3f6fa', muted: '#94a0b0', muted2: '#59626f',
  red: '#ef5350', purple: '#b06bf5', blue: '#5a8cff', orange: '#f5a623', gold: '#f5d142',
};

type PosKey = 'ANG' | 'MIT' | 'VER' | 'TOR';
const POS: Record<PosKey, { label: string; short: string; color: string }> = {
  ANG: { label: 'ANGREIFER', short: 'Angreifer', color: C.red },
  MIT: { label: 'MITTELFELD', short: 'Mittelfeld', color: C.purple },
  VER: { label: 'VERTEIDIGER', short: 'Verteidiger', color: C.blue },
  TOR: { label: 'TORWART', short: 'Torwart', color: C.orange },
};

const PITCH = { x: 48, y: 196, w: 1018, h: 545 };
const px = (fx: number) => PITCH.x + fx * PITCH.w;
const py = (fy: number) => PITCH.y + fy * PITCH.h;

interface Slot { id: string; pos: PosKey; fx: number; fy: number; name: string; codes: string[]; solve: number; hint?: boolean; }
const SLOTS: Slot[] = [
  { id: 'a1', pos: 'ANG', fx: 0.16, fy: 0.13, name: 'Robert Lewandowski', codes: ['PL'], solve: -1 },
  { id: 'a2', pos: 'ANG', fx: 0.39, fy: 0.13, name: 'Thomas Müller', codes: ['DE'], solve: 8.8 },
  { id: 'a3', pos: 'ANG', fx: 0.61, fy: 0.13, name: 'Serge Gnabry', codes: ['DE'], solve: -1 },
  { id: 'a4', pos: 'ANG', fx: 0.84, fy: 0.13, name: 'Kingsley Coman', codes: ['FR'], solve: 9.4 },
  { id: 'm1', pos: 'MIT', fx: 0.33, fy: 0.40, name: 'Thiago Alcántara', codes: ['ES', 'IT'], solve: 10.0 },
  { id: 'm2', pos: 'MIT', fx: 0.67, fy: 0.40, name: 'Leon Goretzka', codes: ['DE'], solve: -1 },
  { id: 'd1', pos: 'VER', fx: 0.13, fy: 0.66, name: 'Jérôme Boateng', codes: ['DE'], solve: 7.5, hint: true },
  { id: 'd2', pos: 'VER', fx: 0.38, fy: 0.66, name: 'David Alaba', codes: ['AT'], solve: 10.6 },
  { id: 'd3', pos: 'VER', fx: 0.62, fy: 0.66, name: 'Joshua Kimmich', codes: ['DE'], solve: -1 },
  { id: 'd4', pos: 'VER', fx: 0.85, fy: 0.66, name: 'Alphonso Davies', codes: ['CA', 'GH'], solve: 12.6 },
  { id: 'g1', pos: 'TOR', fx: 0.50, fy: 0.90, name: 'Manuel Neuer', codes: ['DE'], solve: 13.1 },
];
const T_82 = 10.6, T_COMPLETE = 13.1, T_RESULT = 13.8, T_RANKED = 17.4, T_CTA = 23.6, DURATION = 26.8;

interface Club { name: string; years: string; col: string; ini: string; logoName: string; tag?: string; current?: boolean; }
const CLUBS: Club[] = [
  { name: 'TeBe Youth', years: '2002 – 2002', col: '#7a2d8f', ini: 'TB', logoName: 'Tennis Borussia Berlin', tag: 'NACHWUCHS' },
  { name: 'Hertha BSC Youth', years: '2002 – 2003', col: '#1c4fb0', ini: 'H', logoName: 'Hertha BSC', tag: 'NACHWUCHS' },
  { name: 'Hertha BSC U17', years: '2003 – 2005', col: '#1c4fb0', ini: 'H', logoName: 'Hertha BSC', tag: 'NACHWUCHS' },
  { name: 'Hertha BSC U19', years: '2005 – 2006', col: '#1c4fb0', ini: 'H', logoName: 'Hertha BSC', tag: 'NACHWUCHS' },
  { name: 'Hertha BSC', years: '2006 – 2007', col: '#1c4fb0', ini: 'H', logoName: 'Hertha BSC' },
  { name: 'Hamburg', years: '2007 – 2010', col: '#1668c4', ini: 'HSV', logoName: 'Hamburger SV' },
  { name: 'Manchester City', years: '2010 – 2011', col: '#6cabdd', ini: 'MC', logoName: 'Manchester City' },
  { name: 'Bayern Munich', years: '2011 – heute', col: '#dc0511', ini: 'FCB', logoName: 'Bayern Munich', current: true },
];

const CLUB_LOGOS: Record<string, string> = {
  'Bayern Munich': 'https://r2.thesportsdb.com/images/media/team/badge/01ogkh1716960412.png',
  'Manchester City': 'https://r2.thesportsdb.com/images/media/team/badge/vwpvry1467462651.png',
  'Hertha BSC': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Hertha_BSC_Logo_2012.svg/1920px-Hertha_BSC_Logo_2012.svg.png',
  'Hamburger SV': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Hamburger_SV_logo.svg/1920px-Hamburger_SV_logo.svg.png',
  'Tennis Borussia Berlin': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Tennis_Borussia_Berlin_logo.svg/1280px-Tennis_Borussia_Berlin_logo.svg.png',
};
const logoUrl = (name?: string) => (name && CLUB_LOGOS[name]) || null;

// ── Flaggen ─────────────────────────────────────────────────────────────────
function FlagBox({ code, w, h }: { code: string; w: number; h: number }) {
  const bars = (cols: string[], dir: 'row' | 'column' = 'column') => (
    <div style={{ width: w, height: h, display: 'flex', flexDirection: dir }}>
      {cols.map((c, i) => <div key={i} style={{ flex: 1, background: c }} />)}
    </div>
  );
  switch (code) {
    case 'DE': return bars(['#1a1d22', '#D00712', '#FFCE00']);
    case 'AT': return bars(['#ED2939', '#fff', '#ED2939']);
    case 'PL': return bars(['#fff', '#DC143C']);
    case 'IT': return bars(['#009246', '#fff', '#CE2B37'], 'row');
    case 'FR': return bars(['#002395', '#fff', '#ED2939'], 'row');
    case 'ES': return bars(['#AA151B', '#F1BF00', '#AA151B']);
    case 'GH': return bars(['#CE1126', '#FCD116', '#006B3F']);
    case 'CA': return bars(['#D52B1E', '#fff', '#D52B1E'], 'row');
    default: return <div style={{ width: w, height: h, background: '#444' }} />;
  }
}
function CircleFlag({ codes, size = 34 }: { codes: string[]; size?: number }) {
  const arr = Array.isArray(codes) ? codes : [codes];
  const ring: CSS = { borderRadius: '50%', overflow: 'hidden', boxShadow: '0 0 0 2px rgba(255,255,255,0.85), 0 2px 5px rgba(0,0,0,0.5)', flexShrink: 0, background: '#222' };
  if (arr.length === 1) {
    return <div style={{ width: size, height: size, ...ring, display: 'flex' }}><FlagBox code={arr[0]} w={size} h={size} /></div>;
  }
  const s = size * 0.74;
  return (
    <div style={{ position: 'relative', width: size + s * 0.45, height: size, flexShrink: 0 }}>
      <div style={{ position: 'absolute', left: 0, top: (size - s) / 2, width: s, height: s, ...ring, display: 'flex' }}><FlagBox code={arr[0]} w={s} h={s} /></div>
      <div style={{ position: 'absolute', right: 0, top: (size - s) / 2, width: s, height: s, ...ring, display: 'flex' }}><FlagBox code={arr[1]} w={s} h={s} /></div>
    </div>
  );
}

function LogoBadge({ src, ini, color, size, radius }: { src: string | null; ini: string; color: string; size: number; radius?: number }) {
  const [err, setErr] = useState(false);
  const r = radius != null ? radius : size * 0.3;
  const box: CSS = { width: size, height: size, borderRadius: r, flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' };
  if (src && !err) {
    return <div style={{ ...box, background: 'rgba(255,255,255,0.08)' }}><img src={src} alt="" onError={() => setErr(true)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /></div>;
  }
  return <div style={{ ...box, background: color, fontFamily: 'Anton, sans-serif', fontSize: size * (ini && ini.length > 2 ? 0.26 : 0.34), color: '#fff', boxShadow: '0 0 0 1px rgba(255,255,255,0.12)' }}>{ini}</div>;
}

function PositionChip({ pos }: { pos: PosKey }) {
  const p = POS[pos];
  return (
    <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 10, letterSpacing: '0.05em', color: p.color, background: 'rgba(6,10,16,0.82)', border: `1px solid ${p.color}`, borderRadius: 5, padding: '2px 7px', lineHeight: 1, whiteSpace: 'nowrap', textShadow: `0 0 9px ${p.color}66` }}>{p.label}</div>
  );
}

// ── Spielfeld ────────────────────────────────────────────────────────────────
function Pitch() {
  const line = 'rgba(220,255,235,0.28)';
  const lb: CSS = { position: 'absolute', border: `2px solid ${line}` };
  return (
    <div style={{ position: 'absolute', left: PITCH.x, top: PITCH.y, width: PITCH.w, height: PITCH.h, borderRadius: 16, overflow: 'hidden', background: '#0e3c28' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,#0e3c28 0%,#1aa257 50%,#0f4329 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(180deg, rgba(255,255,255,0.05) 0 46px, rgba(0,0,0,0.05) 46px 92px)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 80% at 50% 42%, rgba(255,255,255,0.12), transparent 60%)' }} />
      <div style={{ ...lb, left: 18, top: 16, right: 18, bottom: 16, borderRadius: 4 }} />
      <div style={{ position: 'absolute', left: 18, right: 18, top: '50%', height: 0, borderTop: `2px solid ${line}` }} />
      <div style={{ ...lb, left: '50%', top: '50%', width: 150, height: 150, borderRadius: '50%', transform: 'translate(-50%,-50%)' }} />
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: 7, height: 7, borderRadius: '50%', background: line, transform: 'translate(-50%,-50%)' }} />
      <div style={{ ...lb, left: '50%', top: 16, width: 320, height: 96, transform: 'translateX(-50%)', borderTop: 'none' }} />
      <div style={{ ...lb, left: '50%', top: 16, width: 150, height: 44, transform: 'translateX(-50%)', borderTop: 'none' }} />
      <div style={{ ...lb, left: '50%', bottom: 16, width: 320, height: 96, transform: 'translateX(-50%)', borderBottom: 'none' }} />
      <div style={{ ...lb, left: '50%', bottom: 16, width: 150, height: 44, transform: 'translateX(-50%)', borderBottom: 'none' }} />
    </div>
  );
}

function PlayerTile({ slot, time }: { slot: Slot; time: number }) {
  const cx = px(slot.fx), cy = py(slot.fy);
  const W = 102, H = 108;
  const solved = slot.solve < 0 ? true : time >= slot.solve;
  const justT = slot.solve < 0 ? 1 : clamp((time - slot.solve) / 0.42, 0, 1);
  const scale = (slot.solve >= 0 && solved) ? 1 + 0.22 * Math.sin(Math.min(justT, 1) * Math.PI) : 1;
  const active = slot.hint && !solved && time >= 3.0;
  const accent = solved ? C.green : active ? C.blue : null;
  const [first, ...rest] = slot.name.split(' ');
  const last = rest.join(' ') || first;
  return (
    <div style={{ position: 'absolute', left: cx - W / 2, top: cy - H / 2, width: W, height: H, transform: `scale(${scale})`, transformOrigin: 'center', zIndex: solved ? 6 : active ? 7 : 4, willChange: 'transform' }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: 14, background: solved ? 'linear-gradient(180deg, rgba(34,197,94,0.30), rgba(8,30,18,0.55))' : active ? 'linear-gradient(180deg, rgba(90,140,255,0.30), rgba(10,18,40,0.6))' : 'linear-gradient(180deg, rgba(20,27,38,0.88), rgba(7,10,16,0.92))', boxShadow: accent ? `0 0 0 2px ${accent}, 0 0 26px ${accent}aa, inset 0 1px 0 rgba(255,255,255,0.08)` : '0 0 0 1px rgba(255,255,255,0.06), 0 8px 18px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 16 }}>
        <CircleFlag codes={slot.codes} size={34} />
        {solved && (
          <div style={{ marginTop: 7, textAlign: 'center', opacity: justT }}>
            <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 12.5, color: '#eafff1', lineHeight: 1.12, padding: '0 4px' }}>{first}<br />{last}</div>
            <div style={{ color: C.greenBright, fontSize: 14, fontWeight: 800, marginTop: 2, textShadow: `0 0 8px ${C.green}` }}>✓</div>
          </div>
        )}
      </div>
      <div style={{ position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)' }}>
        <PositionChip pos={slot.pos} />
      </div>
    </div>
  );
}

function BoardHeader({ time }: { time: number }) {
  const sec = Math.floor(248 + time);
  const mm = String(Math.floor(sec / 60)).padStart(2, '0');
  const ss = String(sec % 60).padStart(2, '0');
  const pill = (txt: React.ReactNode, extra?: CSS) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, height: 32, padding: '0 14px', borderRadius: 9, background: C.panel, border: `1px solid ${C.line2}`, fontFamily: 'Inter, sans-serif', fontSize: 13.5, color: C.muted, ...extra }}>{txt}</div>
  );
  return (
    <div style={{ position: 'absolute', left: 0, top: 14, width: 1280, height: 40, display: 'flex', alignItems: 'center', padding: '0 26px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <LogoBadge src={logoUrl('Bayern Munich')} ini="FCB" color="#dc0511" size={34} radius={17} />
        <div>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 16, letterSpacing: '0.02em', color: C.text, lineHeight: 1 }}>BAYERN MUNICH</div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.muted2, marginTop: 2 }}>2019 · Bundesliga</div>
        </div>
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 17, fontWeight: 600, color: C.text, marginRight: 4 }}>{mm}:{ss}</div>
        {pill(<><span style={{ width: 10, height: 10, borderRadius: '50%', background: C.green, boxShadow: `0 0 8px ${C.green}` }} />Easy</>, { color: C.text })}
        {pill('Freizeit · Einzel', { borderColor: `${C.green}55`, color: C.greenBright, background: `${C.green}14` })}
        {pill('✕ Aufgeben')}
      </div>
    </div>
  );
}

function TopControls({ time, solvedCount }: { time: number; solvedCount: number }) {
  const full = 'Boateng';
  const tp = clamp((time - 6.7) / 0.7, 0, 1);
  const n = Math.round(tp * full.length);
  const typed = time >= 6.7 && time < 7.45 ? full.slice(0, n) : '';
  const showSuggest = time >= 7.05 && time < 7.5;
  const ratenPulse = time >= 7.28 && time < 7.5;
  const caretOn = time >= 6.7 && time < 7.28 && Math.floor(time * 2.6) % 2 === 0;
  const W = 660, X = (1280 - W) / 2;
  const pct = Math.round((solvedCount / 11) * 100);
  const showComplete = solvedCount >= 9;
  const compIn = clamp((time - T_82) / 0.45, 0, 1);
  const nudge = time >= T_82 + 0.4 && time < T_COMPLETE - 0.1;
  return (
    <div style={{ position: 'absolute', left: X, top: 70, width: W }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, height: 50, borderRadius: 13, background: C.panel, border: `1px solid ${showSuggest || typed ? C.green + '99' : C.line2}`, boxShadow: typed ? `0 0 0 3px ${C.green}22` : 'none', display: 'flex', alignItems: 'center', gap: 11, padding: '0 16px' }}>
          <span style={{ fontSize: 18, opacity: 0.85 }}>⚽</span>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 15.5, color: typed ? C.text : C.muted2, whiteSpace: 'nowrap', overflow: 'hidden' }}>
            {typed || 'Spieler erraten – Nachname oder vollständiger Name…'}
            {caretOn && <span style={{ color: C.green }}>|</span>}
          </span>
        </div>
        <div style={{ height: 50, padding: '0 26px', borderRadius: 13, background: C.green, color: '#04130a', fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', transform: `scale(${ratenPulse ? 0.92 : 1})`, boxShadow: ratenPulse ? `0 0 28px ${C.green}` : `0 6px 18px ${C.green}33` }}>Raten</div>
      </div>

      {showSuggest && (
        <div style={{ position: 'absolute', left: 0, right: 96, top: 56, background: C.panel2, border: `1px solid ${C.line2}`, borderRadius: 13, padding: 6, boxShadow: '0 18px 40px rgba(0,0,0,0.6)', zIndex: 30 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 9, background: `${C.green}22`, border: `1px solid ${C.green}66` }}>
            <CircleFlag codes={['DE']} size={28} />
            <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 15.5, color: C.text }}>Jérôme Boateng</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: C.muted, marginLeft: 'auto' }}>Verteidiger</div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 16 }}>
        <div style={{ flex: 1, height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{ width: `${(solvedCount / 11) * 100}%`, height: '100%', borderRadius: 4, background: `linear-gradient(90deg,${C.greenDim},${C.greenBright})`, boxShadow: `0 0 12px ${C.green}aa`, transition: 'width 200ms' }} />
        </div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 600, color: solvedCount === 11 ? C.greenBright : C.muted, width: 46, textAlign: 'right' }}>{solvedCount}/11</div>
      </div>

      {showComplete && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 14, opacity: compIn, transform: `translateY(${(1 - compIn) * -8}px)` }}>
          <div style={{ padding: '11px 26px', borderRadius: 11, background: `${C.green}18`, border: `1.5px solid ${C.green}`, color: C.greenBright, fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 16, boxShadow: nudge ? `0 0 ${18 + 8 * Math.sin(time * 4)}px ${C.green}66` : `0 0 14px ${C.green}33` }}>Level abschließen · {pct}%</div>
          {nudge && (
            <div style={{ marginTop: 9, fontFamily: 'Inter, sans-serif', fontSize: 13.5, color: C.muted }}>
              … oder alle <span style={{ color: C.text, fontWeight: 700 }}>11 erraten</span> für mehr <span style={{ color: C.greenBright, fontWeight: 700 }}>XP &amp; LP</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProgressSidebar({ time }: { time: number }) {
  const order = ['g1', 'd1', 'd2', 'd3', 'd4', 'm1', 'm2', 'a1', 'a2', 'a3', 'a4'];
  const rows = order.map((id) => SLOTS.find((s) => s.id === id)!);
  return (
    <div style={{ position: 'absolute', left: 1078, top: 176, width: 186, background: 'rgba(13,18,26,0.82)', border: `1px solid ${C.line2}`, borderRadius: 16, padding: '14px 14px 8px', backdropFilter: 'blur(3px)', boxShadow: '0 16px 40px rgba(0,0,0,0.45)' }}>
      <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 13, letterSpacing: '0.22em', color: C.muted, marginBottom: 10 }}>FORTSCHRITT</div>
      {rows.map((s) => {
        const solved = s.solve < 0 ? true : time >= s.solve;
        return (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '5px 0' }}>
            <CircleFlag codes={s.codes} size={22} />
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: solved ? C.text : C.muted, fontWeight: solved ? 600 : 400 }}>{POS[s.pos].short}</div>
            <div style={{ marginLeft: 'auto', color: solved ? C.greenBright : C.muted2, fontSize: solved ? 13 : 18, fontWeight: 800, lineHeight: 1 }}>{solved ? '✓' : '·'}</div>
          </div>
        );
      })}
    </div>
  );
}

function CareerPanel({ time }: { time: number }) {
  const open = clamp((time - 3.0) / 0.6, 0, 1);
  const close = clamp((time - 7.0) / 0.5, 0, 1);
  const reveal = open * (1 - close);
  if (reveal <= 0.01) return null;
  const headerH = 64, rowH = 40;
  const bodyH = CLUBS.length * rowH + 16;
  const h = headerH + bodyH * reveal;
  return (
    <div style={{ position: 'absolute', left: 60, top: 760, width: 1160, background: 'rgba(12,17,25,0.98)', border: `1px solid ${C.line2}`, borderRadius: 18, boxShadow: '0 28px 70px rgba(0,0,0,0.6)', overflow: 'hidden', height: h }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 22px', height: headerH, boxSizing: 'border-box' }}>
        <CircleFlag codes={['DE']} size={30} />
        <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: 17, color: C.blue }}>💡 Karriere-Tipp</div>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: C.muted, marginLeft: 4 }}>Germany · Verteidiger</div>
        <div style={{ marginLeft: 'auto', color: C.muted2, fontSize: 19 }}>✕</div>
      </div>
      <div style={{ padding: '0 22px 16px', opacity: reveal }}>
        {CLUBS.map((c, i) => {
          const rv = clamp((time - (3.5 + i * 0.16)) / 0.3, 0, 1) * (1 - close);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, height: rowH, opacity: rv, transform: `translateX(${(1 - rv) * 14}px)` }}>
              <div style={{ position: 'relative', width: 14, display: 'flex', justifyContent: 'center', alignSelf: 'stretch', alignItems: 'center' }}>
                {i < CLUBS.length - 1 && <div style={{ position: 'absolute', top: '50%', bottom: -8, width: 2, background: 'rgba(255,255,255,0.12)' }} />}
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.current ? C.green : 'transparent', border: c.current ? 'none' : `1.5px solid ${C.muted2}`, boxShadow: c.current ? `0 0 10px ${C.green}` : 'none', zIndex: 1 }} />
              </div>
              <LogoBadge src={logoUrl(c.logoName)} ini={c.ini} color={c.col} size={28} radius={14} />
              <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 15, color: C.text }}>{c.name}</div>
              {c.tag && <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, letterSpacing: '0.05em', color: C.muted, background: 'rgba(255,255,255,0.07)', padding: '3px 7px', borderRadius: 5 }}>{c.tag}</div>}
              <div style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, color: C.muted2 }}>{c.years}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const camCy = interpolate([0, 2.6, 3.5, 6.1, 6.7, 9.6, 10.5, 13.0, 13.6], [332, 332, 905, 940, 358, 358, 322, 322, 392], Easing.easeInOutCubic);
const camScale = interpolate([0, 2.6, 3.5, 6.1, 6.7, 9.6, 10.5, 13.0, 13.6], [1.0, 1.0, 0.95, 0.95, 1.02, 1.0, 0.97, 0.97, 1.0], Easing.easeInOutCubic);

function BoardLayer({ time }: { time: number }) {
  const fadeIn = clamp(time / 0.5, 0, 1);
  const fadeOut = 1 - clamp((time - (T_RESULT - 0.5)) / 0.5, 0, 1);
  const opacity = fadeIn * fadeOut;
  if (opacity <= 0.01) return null;
  const s = camScale(time), cy = camCy(time);
  const tx = 640 - 640 * s, ty = 360 - cy * s;
  const solvedCount = SLOTS.filter((sl) => (sl.solve < 0 ? true : time >= sl.solve)).length;
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.bg, opacity }}>
      <div style={{ position: 'absolute', inset: 0, transformOrigin: '0 0', transform: `translate(${tx}px,${ty}px) scale(${s})`, willChange: 'transform' }}>
        <BoardHeader time={time} />
        <Pitch />
        {SLOTS.map((sl) => <PlayerTile key={sl.id} slot={sl} time={time} />)}
        <ProgressSidebar time={time} />
        <CareerPanel time={time} />
        <TopControls time={time} solvedCount={solvedCount} />
      </div>
    </div>
  );
}

function ResultsLayer({ time }: { time: number }) {
  const lt = time - T_RESULT;
  if (lt < 0 || time > T_RANKED + 0.1) return null;
  const fade = clamp(lt / 0.5, 0, 1) * (1 - clamp((time - (T_RANKED - 0.4)) / 0.4, 0, 1));
  const pop = Easing.easeOutBack(clamp(lt / 0.6, 0, 1));
  const xp = Math.round(interpolate([0.6, 1.6], [0, 225], Easing.easeOutCubic)(lt));
  const trophyPop = clamp((lt - 0.2) / 0.5, 0, 1);
  const stats: Array<[string, string, string]> = [['11/11', 'Erraten', C.greenBright], ['7:14', 'Zeit', C.text], ['100%', 'Genauigkeit', C.text]];
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.bg, opacity: fade, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ width: 560, borderRadius: 22, overflow: 'hidden', border: `1.5px solid ${C.green}`, boxShadow: `0 0 60px ${C.green}55, 0 30px 80px rgba(0,0,0,0.6)`, transform: `scale(${0.9 + 0.1 * pop})`, background: C.panel }}>
        <div style={{ background: 'linear-gradient(180deg, rgba(34,197,94,0.16), rgba(34,197,94,0.02))', padding: '34px 30px 26px', textAlign: 'center' }}>
          <div style={{ fontSize: 58, lineHeight: 1, transform: `scale(${0.5 + 0.5 * Easing.easeOutBack(trophyPop)})`, filter: `drop-shadow(0 0 18px ${C.green}aa)` }}>🏆</div>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 52, letterSpacing: '0.04em', color: C.greenBright, marginTop: 10, textShadow: `0 0 30px ${C.green}66` }}>PERFEKT!</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 8 }}>
            <LogoBadge src={logoUrl('Bayern Munich')} ini="FCB" color="#dc0511" size={24} radius={12} />
            <div style={{ fontSize: 15.5, color: C.muted }}>Bayern Munich · 2019 · Bundesliga</div>
          </div>
        </div>
        <div style={{ display: 'flex', padding: '24px 0', borderTop: `1px solid ${C.line}` }}>
          {stats.map(([v, l, col], i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 34, color: col }}>{v}</div>
              <div style={{ fontSize: 13.5, color: C.muted2, marginTop: 4 }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', padding: '14px 0', borderTop: `1px solid ${C.line}`, color: C.greenBright, fontWeight: 700, fontSize: 15 }}>Alle Spieler erraten: Perfect-Bonus erhalten.</div>
        <div style={{ display: 'flex', padding: '18px 0 22px', borderTop: `1px solid ${C.line}` }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: C.muted2 }}>XP</div>
            <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 30, color: C.greenBright, marginTop: 3 }}>+{xp}</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center', borderLeft: `1px solid ${C.line}` }}>
            <div style={{ fontSize: 13, color: C.muted2 }}>LP</div>
            <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 30, color: C.muted, marginTop: 3 }}>+0</div>
          </div>
        </div>
        <div style={{ padding: '0 30px 16px' }}>
          <div style={{ height: 52, borderRadius: 12, background: C.green, color: '#04130a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 17 }}>Nochmal spielen</div>
        </div>
      </div>
    </div>
  );
}

interface LbRow { rank: number; name: string; lp: string; you?: boolean; }
const LB: LbRow[] = [
  { rank: 4, name: 'leipzig_lars', lp: '+0' },
  { rank: 5, name: 'elf_meister', lp: '+0' },
  { rank: 6, name: 'DU', lp: '+18', you: true },
  { rank: 7, name: 'bvb_til_ich', lp: '+0' },
];

function RankedLayer({ time }: { time: number }) {
  const lt = time - T_RANKED;
  if (lt < 0 || time > T_CTA + 0.1) return null;
  const fade = clamp(lt / 0.45, 0, 1) * (1 - clamp((time - (T_CTA - 0.4)) / 0.4, 0, 1));
  const lpFill = interpolate([0.8, 3.2], [0.34, 0.92], Easing.easeInOutCubic)(lt);
  const lpNum = Math.round(interpolate([0.8, 3.2], [0, 18], Easing.easeOutCubic)(lt));
  const badgePop = clamp((lt - 1.8) / 1.0, 0, 1);
  const shine = clamp((lt - 2.2) / 1.4, 0, 1);
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(80% 90% at 50% 28%, #14202f, #070b12)', opacity: fade, zIndex: 55, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(46% 40% at 30% 30%, ${C.green}1c, transparent 70%)` }} />
      <div style={{ position: 'absolute', top: 76, left: 0, right: 0, textAlign: 'center' }}>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 16, letterSpacing: '0.34em', color: C.greenBright }}>RANKED · DEIN ZIEL</div>
      </div>
      <div style={{ position: 'absolute', left: 150, top: 188, width: 470 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, opacity: badgePop, transform: `translateY(${(1 - badgePop) * 14}px)` }}>
          <div style={{ position: 'relative', width: 78, height: 78, borderRadius: 18, background: `conic-gradient(#e3a063, #7a4419, #cd7f32, #e3a063)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 28px rgba(205,127,50,0.55)', transform: `scale(${0.6 + 0.4 * Easing.easeOutBack(badgePop)})`, overflow: 'hidden' }}>
            <div style={{ width: 64, height: 64, borderRadius: 14, background: '#0c1018', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 20, color: '#cd7f32', lineHeight: 1 }}>BRZ</div>
              <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 14, color: '#fff' }}>3</div>
            </div>
            <div style={{ position: 'absolute', top: 0, bottom: 0, width: 24, left: `${-30 + shine * 130}%`, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.75),transparent)', transform: 'skewX(-18deg)' }} />
          </div>
          <div>
            <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 40, color: '#fff', lineHeight: 1 }}>BRONZE 3</div>
            <div style={{ fontSize: 15, color: C.muted, marginTop: 4 }}>+{lpNum} LP · auf dem Weg zu <span style={{ color: '#cd7f32', fontWeight: 700 }}>Bronze 2</span></div>
          </div>
        </div>
        <div style={{ marginTop: 22, width: 440, height: 14, borderRadius: 8, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', border: `1px solid ${C.line2}` }}>
          <div style={{ width: `${lpFill * 100}%`, height: '100%', background: `linear-gradient(90deg,#7a4419,#cd7f32)`, boxShadow: '0 0 18px rgba(205,127,50,0.65)', borderRadius: 8 }} />
        </div>
        <div style={{ marginTop: 16, fontSize: 16.5, color: C.muted, maxWidth: 430, lineHeight: 1.5 }}>
          In <span style={{ color: C.greenBright, fontWeight: 700 }}>Ranked</span> zählt jedes Spiel: sammle <span style={{ color: C.text, fontWeight: 600 }}>LP</span>, klettere durch die Ränge und sichere dir <span style={{ color: C.text, fontWeight: 600 }}>Abzeichen</span>.
        </div>
      </div>
      <div style={{ position: 'absolute', right: 150, top: 190, width: 372, background: 'rgba(13,18,26,0.9)', border: `1px solid ${C.line2}`, borderRadius: 16, padding: 16, boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 15, letterSpacing: '0.18em', color: C.text }}>RANGLISTE</div>
          <div style={{ marginLeft: 'auto', fontSize: 11.5, color: C.greenBright, background: `${C.green}1c`, border: `1px solid ${C.green}55`, padding: '3px 9px', borderRadius: 999 }}>LIVE</div>
        </div>
        {LB.map((row, i) => {
          const rv = clamp((lt - (2.6 + i * 0.45)) / 0.6, 0, 1);
          const youGlow = row.you ? clamp((lt - 4.2) / 0.7, 0, 1) : 0;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 10, marginBottom: 6, opacity: rv, transform: `translateX(${(1 - rv) * 22}px)`, background: row.you ? `${C.green}1c` : 'rgba(255,255,255,0.03)', border: row.you ? `1px solid ${C.green}${Math.round(youGlow * 200).toString(16).padStart(2, '0')}` : '1px solid transparent', boxShadow: row.you ? `0 0 ${youGlow * 22}px ${C.green}66` : 'none' }}>
              <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 17, color: row.you ? C.greenBright : C.muted, width: 30 }}>#{row.rank}</div>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: row.you ? `linear-gradient(135deg,${C.greenBright},${C.greenDim})` : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: row.you ? '#06140b' : C.muted }}>{row.name.slice(0, 2).toUpperCase()}</div>
              <div style={{ fontWeight: row.you ? 800 : 600, fontSize: 14.5, color: row.you ? C.text : C.muted }}>{row.you ? 'DU' : row.name}</div>
              {row.you && <div style={{ fontSize: 12, color: C.greenBright, fontWeight: 700 }}>▲ 2</div>}
              <div style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: row.you ? C.greenBright : C.muted2 }}>{row.lp} LP</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CTALayer({ time, ctaText, ctaHeadline }: { time: number; ctaText: string; ctaHeadline: string }) {
  const lt = time - T_CTA;
  if (lt < 0) return null;
  const fadeIn = clamp(lt / 0.6, 0, 1);
  const fadeOut = 1 - clamp((time - (DURATION - 0.35)) / 0.3, 0, 1);
  const opacity = fadeIn * fadeOut;
  const rise = (1 - Easing.easeOutCubic(clamp(lt / 0.8, 0, 1))) * 30;
  const pulse = 1 + 0.035 * Math.sin(lt * 3.2);
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(70% 80% at 50% 42%, #0f1a13, #060a10)', opacity, zIndex: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', textAlign: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(45% 45% at 50% 46%, ${C.green}18, transparent 70%)` }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, transform: `translateY(${rise}px)` }}>
        <span style={{ fontSize: 32 }}>⚽</span>
        <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: 25, letterSpacing: '0.18em', color: C.greenBright }}>GUESSTHETEAM</span>
      </div>
      <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 112, color: '#fff', lineHeight: 0.92, marginTop: 20, transform: `translateY(${rise}px)`, textShadow: `0 0 60px ${C.green}33` }}>{ctaHeadline}</div>
      <div style={{ fontSize: 20, color: C.muted, marginTop: 20, maxWidth: 660, transform: `translateY(${rise}px)` }}>
        <span style={{ color: C.text, fontWeight: 600 }}>Freizeit</span> zum Spielen · <span style={{ color: C.greenBright, fontWeight: 600 }}>Ranked</span> zum Aufsteigen.
      </div>
      <div style={{ marginTop: 38, display: 'inline-flex', alignItems: 'center', gap: 12, padding: '21px 46px', borderRadius: 15, background: C.green, color: '#04130a', fontWeight: 800, fontSize: 25, boxShadow: `0 0 ${30 * pulse}px ${C.green}aa, 0 12px 30px ${C.green}44`, transform: `scale(${pulse})` }}>
        {ctaText} <span style={{ fontSize: 23 }}>→</span>
      </div>
    </div>
  );
}

// ── öffentliche Komponente ───────────────────────────────────────────────────
export interface GameplayPreviewProps {
  ctaText?: string;
  ctaHeadline?: string;
}

export function GameplayPreview({ ctaText = 'Jetzt kostenlos registrieren', ctaHeadline = 'ERKENNE DIE ELF' }: GameplayPreviewProps) {
  const time = useLoopTime(DURATION);
  return (
    <ScaleStage>
      <BoardLayer time={time} />
      <ResultsLayer time={time} />
      <RankedLayer time={time} />
      <CTALayer time={time} ctaText={ctaText} ctaHeadline={ctaHeadline} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', boxShadow: 'inset 0 0 170px rgba(0,0,0,0.55)', zIndex: 70 }} />
    </ScaleStage>
  );
}

export default GameplayPreview;
