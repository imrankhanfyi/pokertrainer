import { useState } from 'react';
import { ALL_CLASSES } from '../engine/cards';
import { chartAction, getChart } from '../engine/preflop';
import type { Question } from '../engine/scenarios/types';

export function ChartAfterMiss({ chart }: { chart: NonNullable<Question['chart']> }) {
  const [open, setOpen] = useState(false);
  const c = getChart(chart.format, chart.situation, chart.pos);
  if (!c) return null;
  const callLabel = chart.situation === 'open' ? 'Limp' : chart.pos === 'BB' && chart.situation === 'limpers' ? 'Check' : 'Call';
  return (
    <div className="chart-miss">
      <button className="linklike" aria-expanded={open} onClick={() => setOpen((o) => !o)}>{open ? 'Hide the chart' : 'See the whole chart'}</button>
      {open && (
        <div className="cm-body">
          <div className="grid13 mini" role="img" aria-label={`Chart for ${chart.pos}. Your hand ${chart.hand} is ${chartAction(c, chart.hand)}.`}>
            {ALL_CLASSES.map((hc) => (
              <span key={hc} className={`${chartAction(c, hc)}${hc === chart.hand ? ' sel' : ''}`}>{hc}</span>
            ))}
          </div>
          <div className="legend">
            <span><i className="raise" />Raise</span>
            <span><i className="call" />{callLabel}</span>
            <span><i />Fold</span>
            <span><i className="you" />{chart.hand}</span>
          </div>
        </div>
      )}
    </div>
  );
}
