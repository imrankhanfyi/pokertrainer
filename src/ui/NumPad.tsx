import { useEffect } from 'react';

const MAX_DIGITS = 3;

/**
 * In-app number pad for typed answers (outs, %). It replaces the iPhone keyboard, which
 * slid over the sticky answer bar and made the page scroll the cards out of view.
 * Layout: [ display · unit ][ Check ] / 1–6 / 7 8 9 0 ⌫. A physical keyboard also works.
 */
export function NumPad({ value, onChange, onSubmit, unit, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  unit: string;
  placeholder?: string;
}) {
  const press = (d: string) => { if (value.length < MAX_DIGITS) onChange(value === '0' ? d : value + d); };
  const del = () => onChange(value.slice(0, -1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (/^[0-9]$/.test(e.key)) { e.preventDefault(); press(e.key); }
      else if (e.key === 'Backspace') { e.preventDefault(); del(); }
      else if (e.key === 'Enter' && value) { e.preventDefault(); onSubmit(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="numpad">
      <div className="num-row">
        <div className="num-display" role="status" aria-live="polite" aria-label={`Your answer: ${value || 'empty'} ${unit}`}>
          <span className={value ? 'v' : 'ph'}>{value || placeholder || '0'}</span>
          <span className="unit">{unit}</span>
        </div>
        <button type="button" className="btn primary num-check" disabled={!value} onClick={onSubmit}>Check</button>
      </div>
      <div className="num-keys">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((d) => (
          <button key={d} type="button" className="num-key" onClick={() => press(d)}>{d}</button>
        ))}
        <button type="button" className="num-key del" onClick={del} disabled={!value} aria-label="Delete">⌫</button>
      </div>
    </div>
  );
}
