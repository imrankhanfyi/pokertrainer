import { type Card, FULL_DECK, type Rng, classOf, rankOf, rankValue, shuffled, suitOf } from '../cards';
import { Category, evaluate } from '../evaluator';
import { type OutsAnalysis, analyseOuts, straightRanks } from '../draws';
import { getChart } from '../preflop';

export type DrawKind = 'flush' | 'oesd' | 'gutshot' | 'overcards' | 'combo';

export interface DrawSpot {
  kind: DrawKind;
  hero: [Card, Card];
  villain: [Card, Card];
  villainDesc: string; // "top pair, king kicker"
  board: Card[]; // 3 (flop) or 4 (turn)
  analysis: OutsAnalysis;
}

const KIND_WEIGHTS: [DrawKind, number][] = [['flush', 26], ['oesd', 20], ['gutshot', 16], ['overcards', 16], ['combo', 22]];

function flushDrawSuit(hero: Card[], board: Card[]): string | null {
  for (const s of 'shdc') {
    const n = [...hero, ...board].filter((c) => suitOf(c) === s).length;
    if (n >= 5) return null;
    if (n === 4 && hero.some((c) => suitOf(c) === s)) return s;
  }
  return null;
}

export function classifyDraw(hero: Card[], board: Card[]): DrawKind | null {
  const fd = flushDrawSuit(hero, board) !== null;
  const sr = straightRanks(hero, board);
  const maxBoard = Math.max(...board.map(rankValue));
  const over = hero.every((c) => rankValue(c) > maxBoard) && rankOf(hero[0]) !== rankOf(hero[1]);
  if (fd && sr >= 1) return 'combo';
  if (fd) return 'flush';
  if (sr >= 2) return 'oesd';
  if (sr === 1) return 'gutshot';
  if (over) return 'overcards';
  return null;
}

/** A hand a sensible beginner could actually hold here (in a wide button/big-blind range). */
const PLAYABLE = (() => {
  const set = new Set<string>();
  for (const c of [getChart('sixmax', 'open', 'BTN')!, getChart('sixmax', 'raise', 'BB')!]) for (const h of [...c.raise, ...c.call]) set.add(h);
  return set;
})();

function pickVillain(board: Card[], used: Set<Card>, avoidSuit: string | null, rng: Rng): { cards: [Card, Card]; desc: string } | null {
  const top = board.map(rankValue).reduce((a, b) => Math.max(a, b));
  const topRank = board.find((c) => rankValue(c) === top)![0];
  const free = (pred: (c: Card) => boolean) => shuffled(FULL_DECK.filter((c) => !used.has(c) && pred(c) && (avoidSuit === null || suitOf(c) !== avoidSuit || rng() < 0.15)), rng);
  const kickerNames: Record<string, string> = { A: 'ace', K: 'king', Q: 'queen', J: 'jack', T: 'ten' };
  // Overpair sometimes (when there is room above the board), otherwise top pair with a good kicker.
  if (top <= 12 && rng() < 0.3) {
    const r = 'AKQ'.split('').filter((x) => rankValue(x as never) > top);
    const rank = r[Math.floor(rng() * r.length)];
    const cs = free((c) => rankOf(c) === rank).slice(0, 2);
    if (cs.length === 2) return { cards: [cs[0], cs[1]], desc: `an overpair (${rank === 'A' ? 'aces' : rank === 'K' ? 'kings' : 'queens'})` };
  }
  const pairCard = free((c) => rankOf(c) === topRank)[0];
  const kicks = 'AKQJT'.split('').filter((k) => k !== topRank && !board.some((b) => rankOf(b) === k));
  if (!pairCard || !kicks.length) return null;
  const k = kicks[Math.floor(rng() * Math.min(kicks.length, 3))];
  const kc = free((c) => rankOf(c) === k && c !== pairCard)[0];
  if (!kc) return null;
  return { cards: [pairCard, kc], desc: `top pair, ${kickerNames[k]} kicker` };
}

/**
 * Deal a realistic drawing spot: hero has a pure draw (no pair yet), the opponent
 * has top pair or an overpair and is ahead. Outs are counted by enumeration.
 */
export function buildDrawSpot(street: 'flop' | 'turn', rng: Rng, kind?: DrawKind): DrawSpot {
  const want = kind ?? (() => {
    const total = KIND_WEIGHTS.reduce((s, [, w]) => s + w, 0);
    let r = rng() * total;
    for (const [k, w] of KIND_WEIGHTS) if ((r -= w) < 0) return k;
    return 'flush';
  })();
  const nBoard = street === 'flop' ? 3 : 4;
  for (let attempt = 0; attempt < 20000; attempt++) {
    const d = shuffled(FULL_DECK, rng);
    const hero = [d[0], d[1]] as [Card, Card];
    if (!PLAYABLE.has(classOf(hero[0], hero[1]))) continue;
    const board = d.slice(2, 2 + nBoard);
    if (new Set(board.map(rankOf)).size !== board.length) continue; // unpaired board keeps it simple
    if (evaluate([...hero, ...board]).category !== Category.HighCard) continue; // a pure draw, no pair yet
    if (classifyDraw(hero, board) !== want) continue;
    const used = new Set<Card>([...hero, ...board]);
    const v = pickVillain(board, used, flushDrawSuit(hero, board), rng);
    if (!v) continue;
    const analysis = analyseOuts(hero, v.cards, board);
    if (analysis.outs.length < 3 || analysis.outs.length > 16) continue;
    return { kind: want, hero, villain: v.cards, villainDesc: v.desc, board, analysis };
  }
  throw new Error(`Could not build a ${want} spot`);
}

/** Textbook count a beginner might give, used for distractors. */
export function textbookCount(kind: DrawKind): number {
  return { flush: 9, oesd: 8, gutshot: 4, overcards: 6, combo: 17 }[kind];
}
