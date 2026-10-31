import { type Card, RANK_NAMES, type Rank, rankOf, rankValue, remainingDeck, showCard } from './cards';
import { CATEGORY_NAME, Category, evaluate } from './evaluator';

export interface OutGroup { label: string; cards: Card[] }

export interface OutsAnalysis {
  outs: Card[];
  groups: OutGroup[];
  /** Cards that improve us but still lose – the "dirty outs". */
  dirty: { card: Card; why: string }[];
  heroNow: Category;
  villainNow: Category;
}

const plural = (r: Rank) => (r === '6' ? 'sixes' : `${RANK_NAMES[r].toLowerCase()}s`);

function labelFor(hero: Card[], board: Card[], c: Card): string {
  const cat = evaluate([...hero, ...board, c]).category;
  if (cat >= Category.Straight) return `make ${CATEGORY_NAME[cat]}`;
  if (cat === Category.Trips) return 'make three of a kind';
  if (cat === Category.TwoPair) return 'make two pair';
  if (cat === Category.Pair && hero.some((h) => rankOf(h) === rankOf(c))) return `pair your ${plural(rankOf(c))}`;
  return `make ${CATEGORY_NAME[cat]}`;
}

/**
 * Outs by enumeration vs a known opponent hand, grouped by what they make,
 * plus the cards that look like outs but aren't (dirty outs).
 */
export function analyseOuts(hero: Card[], villain: Card[], board: Card[]): OutsAnalysis {
  const deck = remainingDeck([...hero, ...villain, ...board]);
  const heroNow = evaluate([...hero, ...board]).category;
  const villainNow = evaluate([...villain, ...board]).category;
  const outs: Card[] = [];
  const dirty: OutsAnalysis['dirty'] = [];
  const groups = new Map<string, Card[]>();
  for (const c of deck) {
    const h = evaluate([...hero, ...board, c]);
    const v = evaluate([...villain, ...board, c]);
    if (h.score > v.score) {
      outs.push(c);
      const l = labelFor(hero, board, c);
      groups.set(l, [...(groups.get(l) ?? []), c]);
    } else if (h.category >= Category.Straight && h.category > heroNow) {
      // Looked like an out (we made our straight/flush) but they made something better.
      dirty.push({ card: c, why: `gives you ${CATEGORY_NAME[h.category]} but your opponent ${CATEGORY_NAME[v.category]}` });
    }
  }
  return {
    outs,
    groups: [...groups.entries()].map(([label, cards]) => ({ label, cards })).sort((a, b) => b.cards.length - a.cards.length),
    dirty,
    heroNow,
    villainNow,
  };
}

/** "9 cards make a flush (2♥ 3♥ …); 3 cards pair your aces (A♣ A♦ A♠)". */
export function describeGroups(groups: OutGroup[], maxCards = 9): string {
  return groups
    .map((g) => `${g.cards.length} ${g.cards.length === 1 ? 'card' : 'cards'} ${g.label} (${g.cards.slice(0, maxCards).map(showCard).join(' ')}${g.cards.length > maxCards ? ' …' : ''})`)
    .join('; ');
}

function hasStraight(ranks: Set<number>): boolean {
  if ([14, 2, 3, 4, 5].every((r) => ranks.has(r))) return true;
  for (let top = 14; top >= 6; top--) if ([0, 1, 2, 3, 4].every((d) => ranks.has(top - d))) return true;
  return false;
}

/** How many different ranks would complete a straight for us (2 = open-ended/double gutshot, 1 = gutshot). */
export function straightRanks(hero: Card[], board: Card[]): number {
  const base = new Set([...hero, ...board].map(rankValue));
  if (hasStraight(base)) return 0;
  let n = 0;
  for (let r = 2; r <= 14; r++) if (!base.has(r) && hasStraight(new Set([...base, r]))) n++;
  return n;
}

/** A short beginner name for the draw, derived from the groups. */
export function drawName(groups: OutGroup[], hero: Card[], board: Card[]): string {
  const has = (s: string) => groups.some((g) => g.label.includes(s));
  const flush = has('flush');
  const sr = straightRanks(hero, board);
  const straight = has('straight') || (flush && sr > 0);
  const sName = sr >= 2 ? 'open-ended straight draw' : sr === 1 ? 'gutshot straight draw' : '';
  if (flush && straight) return `flush draw + ${sName}`;
  const pairGroups = groups.filter((g) => g.label.startsWith('pair')).length;
  if (flush) return pairGroups ? `flush draw + overcard${pairGroups > 1 ? 's' : ''}` : 'flush draw';
  if (straight) return groups.some((g) => g.label.startsWith('pair')) ? `${sName} + overcards` : sName;
  if (groups.some((g) => g.label.startsWith('pair'))) return 'overcards';
  return 'draw';
}
