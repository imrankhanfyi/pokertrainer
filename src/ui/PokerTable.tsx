import type { TableVisual, Seat } from '../engine/scenarios/types';
import { Cards } from './components';
import { POS_NAME, type Pos } from '../data/positions';

const fmtBB = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)}bb`;

function stateText(s: Seat): string {
  if (s.tag) return s.tag;
  switch (s.state) {
    case 'folded': return 'Folded';
    case 'blind': return s.bet ? `Blind ${fmtBB(s.bet)}` : '';
    case 'in': return 'In hand';
    case 'waiting': return '';
    default: return '';
  }
}

/**
 * Oval table. Seats go clockwise in action order; the hero (or the button) sits at
 * the bottom so "the next player" is always to the screen-left, as at a real table.
 */
export function PokerTable({ t, zones }: { t: TableVisual; zones?: (p: Pos) => string }) {
  const n = t.seats.length;
  const anchor = t.heroPos ? t.seats.findIndex((s) => s.pos === t.heroPos) : t.seats.findIndex((s) => s.pos === 'BTN');
  const at = (i: number, rx = 43, ry = 40) => {
    const a = ((90 + ((i - anchor) * 360) / n) * Math.PI) / 180;
    return { left: `${50 + rx * Math.cos(a)}%`, top: `${50 + ry * Math.sin(a)}%` };
  };
  const btn = t.seats.findIndex((s) => s.pos === 'BTN');
  const described = t.seats.map((s) => `${t.hideLabels && s.state !== 'hero' ? 'seat' : POS_NAME[s.pos]}${s.state === 'hero' ? ' (you)' : ''}${stateText(s) ? `: ${stateText(s)}` : ''}`).join('; ');
  return (
    <div className="table-wrap" role="img" aria-label={`Table, clockwise from you: ${described}`}>
      <div className="felt">
        <div>
          {t.board && t.board.length > 0 && <div className="board"><Cards cards={t.board} size="sm" /></div>}
          {t.pot != null && <div className="pot">Pot {fmtBB(t.pot)}</div>}
        </div>
      </div>
      {t.seats.map((s, i) => {
        const cls = ['seat', s.state === 'folded' && 'folded', s.state === 'hero' && 'hero', s.state === 'raised' && 'raised', s.highlight && 'hl'].filter(Boolean).join(' ');
        const label = s.state === 'hero' ? (t.hideLabels ? 'YOU' : `${s.pos} · you`) : t.hideLabels ? '' : s.pos;
        const sub = zones ? zones(s.pos) : stateText(s);
        return (
          <div key={s.pos} className={cls} style={at(i)} aria-hidden="true">
            {label || <span style={{ opacity: 0.4 }}>•</span>}
            {sub && <span className="tag">{sub}</span>}
          </div>
        );
      })}
      {btn >= 0 && <div className="dealer" style={at(btn, 28, 22)} aria-hidden="true">D</div>}
      {t.seats.map((s, i) => (s.bet && s.state !== 'folded' && !t.hideLabels ? <span key={`b${s.pos}`} className="chipbet" style={at(i + 0.32, 25, 19)} aria-hidden="true">{fmtBB(s.bet)}</span> : null))}
    </div>
  );
}
