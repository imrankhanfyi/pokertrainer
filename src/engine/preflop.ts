import { ALL_CLASSES, type HandClass } from './cards';
import { type ChartPos, type Format, chartPositions } from '../data/positions';
import { RANGES, type Situation } from '../data/ranges';
import { parseRange } from '../data/ranges/notation';

export type PreAction = 'fold' | 'call' | 'raise';

export interface Chart {
  raise: Set<HandClass>;
  call: Set<HandClass>;
  note?: string;
}

const cache = new Map<string, Chart | null>();

export function getChart(format: Format, situation: Situation, pos: ChartPos): Chart | null {
  const key = `${format}/${situation}/${pos}`;
  if (!cache.has(key)) {
    const spec = RANGES[format][situation][pos];
    cache.set(key, spec ? { raise: parseRange(spec.raise), call: parseRange(spec.call ?? ''), note: spec.note } : null);
  }
  return cache.get(key)!;
}

export function chartAction(chart: Chart, hc: HandClass): PreAction {
  return chart.raise.has(hc) ? 'raise' : chart.call.has(hc) ? 'call' : 'fold';
}

/** Same-ish seat in the other format, for "this differs between formats" notes. */
const OTHER_FORMAT_POS: Record<ChartPos, ChartPos> = { EP: 'UTG', MP: 'HJ', UTG: 'EP', HJ: 'MP', CO: 'CO', BTN: 'BTN', SB: 'SB', BB: 'BB' };

export interface PreflopAnswer {
  action: PreAction;
  /** Action for the same hand one seat earlier / later (if that chart exists). */
  neighbours: { pos: ChartPos; action: PreAction }[];
  otherFormat: { format: Format; pos: ChartPos; action: PreAction } | null;
  close: boolean;
  note?: string;
}

export function preflopAnswer(format: Format, situation: Situation, pos: ChartPos, hc: HandClass): PreflopAnswer {
  const chart = getChart(format, situation, pos);
  if (!chart) throw new Error(`No chart for ${format}/${situation}/${pos}`);
  const action = chartAction(chart, hc);
  const order = chartPositions(format);
  const i = order.indexOf(pos);
  const neighbours: PreflopAnswer['neighbours'] = [];
  for (const j of [i - 1, i + 1]) {
    const np = order[j];
    // Blinds play by different rules (they already have money in), so only compare
    // non-blind seats with each other.
    if (!np || np === 'SB' || np === 'BB' || pos === 'SB' || pos === 'BB') continue;
    const c = getChart(format, situation, np);
    if (c) neighbours.push({ pos: np, action: chartAction(c, hc) });
  }
  const other: Format = format === 'fullring' ? 'sixmax' : 'fullring';
  const oc = getChart(other, situation, OTHER_FORMAT_POS[pos]);
  const otherFormat = oc ? { format: other, pos: OTHER_FORMAT_POS[pos], action: chartAction(oc, hc) } : null;
  return { action, neighbours, otherFormat, close: neighbours.some((n) => n.action !== action), note: chart.note };
}

/** Classes that are "near the edge" of any chart – useful for weighting drills. */
export function borderlineClasses(format: Format, situation: Situation, pos: ChartPos): Set<HandClass> {
  return new Set(ALL_CLASSES.filter((hc) => preflopAnswer(format, situation, pos, hc).close));
}
