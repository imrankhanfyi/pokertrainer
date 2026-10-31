import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { type Card, SUIT_NAME, RANK_NAMES, rankOf, suitOf, SUIT_SYMBOL } from '../engine/cards';
import { GLOSSARY } from '../data/glossary';

// ---------- Icons (inline SVG, no icon font) ----------
const svg = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
export const Icon = {
  back: svg(<path d="M15 18l-6-6 6-6" />),
  chev: svg(<path d="M9 18l6-6-6-6" />),
  close: svg(<path d="M18 6L6 18M6 6l12 12" />),
  practice: svg(<><rect x="4" y="3" width="11" height="15" rx="2" /><path d="M9 21h9a2 2 0 002-2V8" /></>),
  book: svg(<><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></>),
  chart: svg(<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />),
  gear: svg(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" /></>),
  check: svg(<path d="M20 6L9 17l-5-5" />),
  x: svg(<path d="M18 6L6 18M6 6l12 12" />),
  spark: svg(<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" />),
  shuffle: svg(<><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" /></>),
};

// ---------- Playing card ----------
export function PlayingCard({ card, size = 'md' }: { card: Card; size?: 'sm' | 'md' | 'lg' }) {
  const r = rankOf(card);
  const s = suitOf(card);
  return (
    <span className={`pcard ${size} suit-${s}`} role="img" aria-label={`${RANK_NAMES[r]} of ${SUIT_NAME[s]}`}>
      <span className="r">{r === 'T' ? '10' : r}</span>
      <span className="s">{SUIT_SYMBOL[s]}</span>
    </span>
  );
}

export function Cards({ cards, size = 'md' }: { cards: Card[]; size?: 'sm' | 'md' | 'lg' }) {
  return <span className="cards">{cards.map((c) => <PlayingCard key={c} card={c} size={size} />)}</span>;
}

// ---------- Glossary + rich text ----------
const GlossCtx = createContext<(key: string) => void>(() => {});
export const useGlossary = () => useContext(GlossCtx);

export function GlossaryProvider({ children }: { children: ReactNode }) {
  const [key, setKey] = useState<string | null>(null);
  const t = key ? GLOSSARY[key] : null;
  return (
    <GlossCtx.Provider value={setKey}>
      {children}
      {t && (
        <Sheet title={t.term} onClose={() => setKey(null)}>
          <p style={{ fontSize: 18 }}>{t.def}</p>
          <button className="btn" onClick={() => setKey(null)}>Got it</button>
        </Sheet>
      )}
    </GlossCtx.Provider>
  );
}

/** Renders [[key]] / [[key|text]] as tap-to-define links and **text** as bold. */
export function Rich({ text }: { text: string }) {
  const open = useGlossary();
  const parts: ReactNode[] = [];
  const re = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]|\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[3]) parts.push(<strong key={i++}>{m[3]}</strong>);
    else {
      const k = m[1];
      const shown = m[2] ?? GLOSSARY[k]?.term.replace(/\s*\(.*\)$/, '').toLowerCase() ?? k;
      parts.push(
        <button key={i++} type="button" className="gl" onClick={() => open(k)} aria-label={`${shown} – show definition`}>{shown}</button>,
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

// ---------- Bottom sheet ----------
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="grab" />
        <div className="sheet-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">{Icon.close}</button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </>
  );
}

export function TopBar({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <div className="topbar">
      {onBack ? <button className="icon-btn" onClick={onBack} aria-label="Back">{Icon.back}</button> : <span className="spacer" />}
      <div className="title">{title}</div>
      {right ?? <span className="spacer" />}
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} aria-pressed={value === o.id} onClick={() => onChange(o.id)}>{o.label}</button>
      ))}
    </div>
  );
}

export function Toast({ text, onDone }: { text: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2200); return () => clearTimeout(t); }, [onDone]);
  return <div className="toast" role="status">{text}</div>;
}
