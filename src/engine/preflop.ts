import { ALL_CLASSES, type HandClass } from './cards';
import { type ChartPos, type Format } from '../data/positions';
import { RANGES, type Situation } from '../data/ranges';
import { parseRange } from '../data/ranges/notation';

export type PreAction = 'fold' | 'call' | 'raise';

export interface Chart {
  raise: Set<HandClass>;
  call: Set<HandClass>;
  /** Action for any hand in neither set: 'fold', except the big blind facing limpers ('call' = check). */
  default: PreAction;
  note?: string;
}

const cache = new Map<string, Chart | null>();

export function getChart(format: Format, situation: Situation, pos: ChartPos): Chart | null {
  const key = `${format}/${situation}/${pos}`;
  if (!cache.has(key)) {
    const spec = RANGES[format][situation][pos];
    cache.set(key, spec ? { raise: parseRange(spec.raise), call: parseRange(spec.call ?? ''), default: spec.default ?? 'fold', note: spec.note } : null);
  }
  return cache.get(key)!;
}

export function chartAction(chart: Chart, hc: HandClass): PreAction {
  return chart.raise.has(hc) ? 'raise' : chart.call.has(hc) ? 'call' : chart.default;
}

/** The hands directly above, below, left and right of `hc` on the 13×13 chart (the layout RangeGrid draws). */
export function gridNeighbours(hc: HandClass): HandClass[] {
  const i = ALL_CLASSES.indexOf(hc);
  if (i < 0) throw new Error(`Unknown hand class ${hc}`);
  const row = Math.floor(i / 13), col = i % 13;
  const out: HandClass[] = [];
  for (const [r, c] of [[row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]])
    if (r >= 0 && r < 13 && c >= 0 && c < 13) out.push(ALL_CLASSES[r * 13 + c]);
  return out;
}

/**
 * The hands a close call is judged against: for a pair, the next pair up and down (the diagonal);
 * otherwise the orthogonal grid neighbours that aren't pairs. Comparing a pair with the unpaired
 * cells beside it would make folding KK "close" because KQo folds.
 */
export function comparableNeighbours(hc: HandClass): HandClass[] {
  if (hc.length === 2) {
    const i = ALL_CLASSES.indexOf(hc), r = Math.floor(i / 13);
    return [r - 1, r + 1].filter((x) => x >= 0 && x < 13).map((x) => ALL_CLASSES[x * 14]);
  }
  return gridNeighbours(hc).filter((h) => h.length === 3);
}

/** Same-ish seat in the other format, for "this differs between formats" notes. */
const OTHER_FORMAT_POS: Record<ChartPos, ChartPos> = { EP: 'UTG', MP: 'HJ', UTG: 'EP', HJ: 'MP', CO: 'CO', BTN: 'BTN', SB: 'SB', BB: 'BB' };
/** Which format each one is compared with: home6 ↔ 6-max (same seats), full ring → home6 (both home games). */
const OTHER_FORMAT: Record<Format, Format> = { home6: 'sixmax', sixmax: 'home6', fullring: 'home6' };

export interface PreflopAnswer {
  action: PreAction;
  /** Neighbouring hands of the same kind on the 13×13 chart (see comparableNeighbours) whose action differs. */
  neighbours: { hand: HandClass; action: PreAction }[];
  /** Choices that grade as a close call: the actions those neighbours use, if one step from `action` among the
   *  chart's actions (fold < call < raise); never 'fold' for the big blind facing limpers. */
  closeAlternatives: PreAction[];
  otherFormat: { format: Format; pos: ChartPos; action: PreAction } | null;
  close: boolean;
  note?: string;
}

export function preflopAnswer(format: Format, situation: Situation, pos: ChartPos, hc: HandClass): PreflopAnswer {
  const chart = getChart(format, situation, pos);
  if (!chart) throw new Error(`No chart for ${format}/${situation}/${pos}`);
  const action = chartAction(chart, hc);
  const neighbours = comparableNeighbours(hc).map((h) => ({ hand: h, action: chartAction(chart, h) })).filter((n) => n.action !== action);
  const freeCheck = situation === 'limpers' && pos === 'BB'; // folding when you can check is always a mistake
  // Only one step along the actions this chart uses counts as close: in a chart with calls,
  // folding a re-raise hand (AKo next to a folding AQo) skips the call and is a mistake.
  const ladder = (['fold', 'call', 'raise'] as PreAction[]).filter((a) => ALL_CLASSES.some((h) => chartAction(chart, h) === a));
  const oneStep = (a: PreAction) => Math.abs(ladder.indexOf(a) - ladder.indexOf(action)) === 1;
  const closeAlternatives = ladder.filter((a) => neighbours.some((n) => n.action === a) && oneStep(a) && !(freeCheck && a === 'fold'));
  const other = OTHER_FORMAT[format];
  const opos = format === 'fullring' || other === 'fullring' ? OTHER_FORMAT_POS[pos] : pos;
  const oc = getChart(other, situation, opos);
  const otherFormat = oc ? { format: other, pos: opos, action: chartAction(oc, hc) } : null;
  return { action, neighbours, closeAlternatives, otherFormat, close: closeAlternatives.length > 0, note: chart.note };
}

/** Classes on the edge of a chart (a comparable grid neighbour plays differently) – useful for weighting drills. */
export function borderlineClasses(format: Format, situation: Situation, pos: ChartPos): Set<HandClass> {
  return new Set(ALL_CLASSES.filter((hc) => preflopAnswer(format, situation, pos, hc).close));
}
