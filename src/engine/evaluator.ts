import { type Card, rankValue, suitOf } from './cards';

export enum Category {
  HighCard = 0,
  Pair = 1,
  TwoPair = 2,
  Trips = 3,
  Straight = 4,
  Flush = 5,
  FullHouse = 6,
  Quads = 7,
  StraightFlush = 8,
}

export const CATEGORY_NAME: Record<Category, string> = {
  [Category.HighCard]: 'high card',
  [Category.Pair]: 'one pair',
  [Category.TwoPair]: 'two pair',
  [Category.Trips]: 'three of a kind',
  [Category.Straight]: 'a straight',
  [Category.Flush]: 'a flush',
  [Category.FullHouse]: 'a full house',
  [Category.Quads]: 'four of a kind',
  [Category.StraightFlush]: 'a straight flush',
};

export interface HandValue {
  category: Category;
  /** Comparable score: higher is better. Equal score = split pot. */
  score: number;
}

const pack = (cat: Category, kickers: number[]): number => {
  let s = cat;
  for (let i = 0; i < 5; i++) s = s * 15 + (kickers[i] ?? 0);
  return s;
};

/** Highest straight top card in a set of rank values, or 0. Handles the wheel (A-2-3-4-5). */
function straightTop(ranks: Set<number>): number {
  for (let top = 14; top >= 6; top--) {
    let ok = true;
    for (let r = top; r > top - 5; r--) if (!ranks.has(r)) { ok = false; break; }
    if (ok) return top;
  }
  if (ranks.has(14) && ranks.has(2) && ranks.has(3) && ranks.has(4) && ranks.has(5)) return 5;
  return 0;
}

/** Evaluate the best five-card hand from 5–7 cards. */
export function evaluate(cards: readonly Card[]): HandValue {
  if (cards.length < 5 || cards.length > 7) throw new Error('evaluate needs 5–7 cards');
  const counts = new Map<number, number>();
  const bySuit = new Map<string, number[]>();
  for (const c of cards) {
    const r = rankValue(c);
    counts.set(r, (counts.get(r) ?? 0) + 1);
    const s = suitOf(c);
    if (!bySuit.has(s)) bySuit.set(s, []);
    bySuit.get(s)!.push(r);
  }

  // Flush / straight flush
  let flushRanks: number[] | null = null;
  for (const rs of bySuit.values()) if (rs.length >= 5) flushRanks = rs.sort((a, b) => b - a);
  if (flushRanks) {
    const sf = straightTop(new Set(flushRanks));
    if (sf) return { category: Category.StraightFlush, score: pack(Category.StraightFlush, [sf]) };
  }

  // Group ranks by count, then by rank, descending.
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const desc = [...counts.keys()].sort((a, b) => b - a);
  const others = (...excl: number[]) => desc.filter((r) => !excl.includes(r));

  if (groups[0][1] === 4) {
    const q = groups[0][0];
    return { category: Category.Quads, score: pack(Category.Quads, [q, others(q)[0]]) };
  }
  if (groups[0][1] === 3) {
    const t = groups[0][0];
    const pairRank = groups.slice(1).find((g) => g[1] >= 2)?.[0];
    if (pairRank) return { category: Category.FullHouse, score: pack(Category.FullHouse, [t, pairRank]) };
  }
  if (flushRanks) return { category: Category.Flush, score: pack(Category.Flush, flushRanks.slice(0, 5)) };

  const st = straightTop(new Set(desc));
  if (st) return { category: Category.Straight, score: pack(Category.Straight, [st]) };

  if (groups[0][1] === 3) {
    const t = groups[0][0];
    return { category: Category.Trips, score: pack(Category.Trips, [t, ...others(t).slice(0, 2)]) };
  }
  if (groups[0][1] === 2 && groups[1]?.[1] === 2) {
    const [p1, p2] = [groups[0][0], groups[1][0]];
    return { category: Category.TwoPair, score: pack(Category.TwoPair, [p1, p2, others(p1, p2)[0]]) };
  }
  if (groups[0][1] === 2) {
    const p = groups[0][0];
    return { category: Category.Pair, score: pack(Category.Pair, [p, ...others(p).slice(0, 3)]) };
  }
  return { category: Category.HighCard, score: pack(Category.HighCard, desc.slice(0, 5)) };
}

/** +1 if a beats b, -1 if b beats a, 0 for a tie. */
export function compareHands(a: readonly Card[], b: readonly Card[]): number {
  const d = evaluate(a).score - evaluate(b).score;
  return d > 0 ? 1 : d < 0 ? -1 : 0;
}
