import { useState } from 'react';
import type { WorkingStep, WorkingVisual } from '../engine/scenarios/types';
import { PlayingCard, Rich } from './components';

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

function CardsVisual({ v }: { v: Extract<WorkingVisual, { kind: 'cards' }> }) {
  let k = 0;
  const group = (label: string, cards: typeof v.groups[number]['cards'], dead = false) => (
    <div className={`wk-group${dead ? ' dead' : ''}`} key={label + (dead ? '-dead' : '')}>
      <div className="wk-cards">
        {cards.map((c) => (
          <span key={c} className="wk-pop" style={{ animationDelay: `${k++ * 80}ms` }}><PlayingCard card={c} size="sm" /></span>
        ))}
      </div>
      <div className="wk-label">{label}</div>
    </div>
  );
  return (
    <div className="wk-visual wk-cardsrow">
      {v.groups.map((g) => group(g.label, g.cards))}
      {v.dead && group(v.dead.label, v.dead.cards, true)}
    </div>
  );
}

function ChipsVisual({ v }: { v: Extract<WorkingVisual, { kind: 'chips' }> }) {
  const total = v.parts.reduce((s, p) => s + p.bb, 0) || 1;
  return (
    <div className="wk-visual" role="img" aria-label={`${v.parts.map((p) => `${p.label} ${fmt(p.bb)}`).join(', ')}; total ${fmt(total)}`}>
      <div className="wk-stack">
        {v.parts.map((p, i) => (
          <div key={i} className={`wk-seg${p.mine ? ' mine' : ''}`} style={{ flexGrow: p.bb, flexBasis: 0 }}>
            <span className="wk-seg-n">{fmt(p.bb)}</span>
          </div>
        ))}
      </div>
      <div className="wk-legend">
        {v.parts.map((p, i) => <span key={i} className={p.mine ? 'mine' : ''}><i />{p.label} {fmt(p.bb)}</span>)}
        <b>= {fmt(total)}bb</b>
      </div>
    </div>
  );
}

function BarsVisual({ v }: { v: Extract<WorkingVisual, { kind: 'bars' }> }) {
  const clamp = (n: number) => Math.max(0, Math.min(100, n));
  const hasHave = v.have != null;
  const pass = hasHave && v.have! >= v.need;
  const needLabel = v.needLabel ?? `Need ${Math.round(v.need)}%`;
  return (
    <div className="wk-visual wk-bars" role="img" aria-label={`${needLabel}${hasHave ? `; ${v.haveLabel ?? `Have ${Math.round(v.have!)}%`}` : ''}`}>
      <div className="wk-track">
        {hasHave && <div className={`wk-fill ${pass ? 'good' : 'bad'}`} style={{ width: `${clamp(v.have!)}%` }} />}
        <div className="wk-need" style={{ left: `${clamp(v.need)}%` }} />
      </div>
      <div className="wk-bar-labels">
        <span className="wk-need-label" style={{ left: `${clamp(v.need)}%` }}>{needLabel}</span>
        {hasHave && <span className={`wk-have-label ${pass ? 'good' : 'bad'}`}>{v.haveLabel ?? `Have ${Math.round(v.have!)}%`}</span>}
      </div>
    </div>
  );
}

function Visual({ v }: { v: WorkingVisual }) {
  return v.kind === 'cards' ? <CardsVisual v={v} /> : v.kind === 'chips' ? <ChipsVisual v={v} /> : <BarsVisual v={v} />;
}

/** Step-by-step working: one step per tap, plus "Show all". */
export function Working({ steps }: { steps: WorkingStep[] }) {
  const [shown, setShown] = useState(1);
  if (!steps.length) return null;
  const done = shown >= steps.length;
  return (
    <div className="working" aria-label="Working, step by step">
      {steps.slice(0, shown).map((st, i) => (
        <div className="wk-step" key={i}>
          <div className="wk-text"><span className="wk-n">{i + 1}</span><span><Rich text={st.text} /></span></div>
          {st.visual && <Visual v={st.visual} />}
        </div>
      ))}
      {!done && (
        <div className="wk-actions">
          <button className="btn small primary" onClick={() => setShown((n) => n + 1)}>Next step</button>
          <button className="linklike" onClick={() => setShown(steps.length)}>Show all</button>
        </div>
      )}
    </div>
  );
}
