import type { OrderView } from '../engine/scenarios/types';

const ORD = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];

export function orderSummary(o: OrderView): { label: string; caption: string } {
  const n = o.seats.length;
  const hi = o.seats.findIndex((s) => s.status === 'hero');
  const after = o.seats.filter((s) => s.status === 'waiting').length;
  const street = o.street === 'preflop' ? 'Preflop' : o.street[0].toUpperCase() + o.street.slice(1);
  if (hi < 0) return { label: `${street}: order of play`, caption: '' };
  const caption = `You act ${ORD[hi] ?? `#${hi + 1}`}${after ? ` · ${after} to come` : ' · last'}`;
  return { label: `${street}: you act ${ORD[hi] ?? `number ${hi + 1}`} of ${n}; ${after === 0 ? 'nobody' : `${after}`} still to act after you`, caption };
}

/** Tiny order-of-play oval: seats clockwise in action order, hero at the bottom (as in PokerTable). */
export function OrderOval({ order }: { order: OrderView }) {
  const n = order.seats.length;
  const W = 72, H = 44, rx = 29, ry = 15, cx = W / 2, cy = H / 2;
  const hi = Math.max(0, order.seats.findIndex((s) => s.status === 'hero'));
  const at = (i: number, rX = rx, rY = ry) => {
    const a = ((90 + ((i - hi) * 360) / n) * Math.PI) / 180;
    return { x: cx + rX * Math.cos(a), y: cy + rY * Math.sin(a) };
  };
  const btn = order.seats.findIndex((s) => s.pos === 'BTN');
  const { label, caption } = orderSummary(order);
  const r = n > 6 ? 3 : 3.6;
  return (
    <div className="order-oval">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        <ellipse cx={cx} cy={cy} rx={rx - 4} ry={ry - 3} className="oo-felt" />
        {order.seats.map((s, i) => {
          const p = at(i);
          if (s.status === 'hero') return (
            <g key={s.pos}><circle cx={p.x} cy={p.y} r={r + 2.4} className="oo-ring" /><circle cx={p.x} cy={p.y} r={r} className="oo-hero" /></g>
          );
          return <circle key={s.pos} cx={p.x} cy={p.y} r={r} className={`oo-${s.status}`} />;
        })}
        {btn >= 0 && (() => { const p = at(btn, rx - 15, ry - 10.5); return <text x={p.x} y={p.y + 2.4} textAnchor="middle" className="oo-d">D</text>; })()}
      </svg>
      {caption && <span className="order-caption" aria-hidden="true">{caption}</span>}
    </div>
  );
}
