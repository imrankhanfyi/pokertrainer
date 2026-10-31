import { useState } from 'react';
import { ALL_CLASSES, describeClass } from '../engine/cards';
import { CHART_POS_LABEL, type ChartPos, type Format, chartPositions } from '../data/positions';
import { type Situation, SITUATION_LABEL } from '../data/ranges';
import { chartAction, getChart } from '../engine/preflop';
import { Rich } from './components';

const ACTION_WORD: Record<Situation, Record<string, string>> = {
  open: { raise: 'Raise', call: 'Limp', fold: 'Fold' },
  limpers: { raise: 'Raise (isolate)', call: 'Call', fold: 'Fold' },
  raise: { raise: 'Re-raise (3-bet)', call: 'Call', fold: 'Fold' },
};

export function RangeGrid({ format, situation }: { format: Format; situation: Situation }) {
  const seats = chartPositions(format).filter((p) => getChart(format, situation, p));
  const [pos, setPos] = useState<ChartPos>(seats[0]);
  const [sel, setSel] = useState<string | null>(null);
  const active = seats.includes(pos) ? pos : seats[0];
  const chart = getChart(format, situation, active)!;
  const pct = (() => {
    let raise = 0, call = 0;
    for (const h of ALL_CLASSES) {
      const c = h.length === 2 ? 6 : h[2] === 's' ? 4 : 12;
      if (chart.raise.has(h)) raise += c; else if (chart.call.has(h)) call += c;
    }
    return { raise: Math.round((raise / 1326) * 100), call: Math.round((call / 1326) * 100) };
  })();
  const callWord = active === 'BB' && situation === 'limpers' ? 'Check' : ACTION_WORD[situation].call;
  return (
    <div className="figure" style={{ textAlign: 'left' }}>
      <div className="tiny" style={{ marginBottom: 4 }}>{SITUATION_LABEL[situation]} · {format === 'fullring' ? 'Full ring' : '6-max'}</div>
      <div className="chips-scroll" role="group" aria-label="Seat">
        {seats.map((p) => (
          <button key={p} className="chip" aria-pressed={p === active} onClick={() => { setPos(p); }}>{CHART_POS_LABEL[p]}</button>
        ))}
      </div>
      <div className="grid13" role="grid" aria-label={`Starting-hand chart for ${CHART_POS_LABEL[active]}`}>
        {ALL_CLASSES.map((h) => {
          const a = chartAction(chart, h);
          return (
            <button key={h} className={`${a === 'fold' ? '' : a}${sel === h ? ' sel' : ''}`} onClick={() => setSel(h)} aria-label={`${h}: ${a === 'call' ? callWord : ACTION_WORD[situation][a]}`}>
              {h}
            </button>
          );
        })}
      </div>
      <div className="legend">
        <span><i className="raise" />{ACTION_WORD[situation].raise} · {pct.raise}%</span>
        {chart.call.size > 0 && <span><i className="call" />{callWord} · {pct.call}%</span>}
        <span><i />Fold</span>
      </div>
      <div className="small" style={{ minHeight: 24, textAlign: 'center' }} aria-live="polite">
        {sel ? (
          <>
            <strong>{sel}</strong> ({describeClass(sel)}): {(() => { const a = chartAction(chart, sel); return a === 'call' ? callWord : ACTION_WORD[situation][a]; })()}
          </>
        ) : chart.note ? <Rich text={chart.note} /> : <span className="muted">Tap a hand to check it.</span>}
      </div>
    </div>
  );
}
