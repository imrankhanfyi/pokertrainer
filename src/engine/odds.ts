import { type Card, type Rng, combinations, remainingDeck } from './cards';
import { evaluate } from './evaluator';

// ---------------------------------------------------------------------------
// Outs
// ---------------------------------------------------------------------------
// We count outs by enumeration rather than by adding up draw types: a card is an
// "out" if, once it lands, our hand beats the opponent's hand. This automatically
// avoids double counting (a flush draw + open-ender is 15 outs, not 17) and
// excludes "dirty" outs that improve us but improve the opponent even more.

export interface OutsResult {
  outs: Card[];
  unseen: number; // cards we can't see (deck minus our cards, their cards, board)
  aheadNow: boolean;
}

export function outsAgainst(hero: Card[], villain: Card[], board: Card[]): OutsResult {
  if (board.length < 3 || board.length > 4) throw new Error('outsAgainst expects a flop or turn');
  const known = [...hero, ...villain, ...board];
  const deck = remainingDeck(known);
  const aheadNow = evaluate([...hero, ...board]).score > evaluate([...villain, ...board]).score;
  const outs = deck.filter((c) => evaluate([...hero, ...board, c]).score > evaluate([...villain, ...board, c]).score);
  return { outs, unseen: deck.length, aheadNow };
}

/** "Draw outs" without an opponent: cards that complete hero to at least `minCategory`. */
export function improvingCards(hero: Card[], board: Card[], minCategory: number): Card[] {
  const deck = remainingDeck([...hero, ...board]);
  return deck.filter((c) => evaluate([...hero, ...board, c]).category >= minCategory);
}

/**
 * Exact chance that at least one of `outs` arrives in the next `cardsToCome` cards.
 * In real games we can't see opponents' cards; following the usual convention we
 * divide by the unseen cards from our point of view (47 on the flop, 46 on the turn).
 */
export function exactHitChance(outs: number, cardsToCome: 1 | 2, unseen = cardsToCome === 2 ? 47 : 46): number {
  return 1 - combinations(unseen - outs, cardsToCome) / combinations(unseen, cardsToCome);
}

/**
 * Rule of 2 and 4. With two cards to come, multiply by 4; with one, multiply by 2.
 * With more than 8 outs the ×4 overstates, so we subtract (outs − 8) – a widely
 * taught correction. Returns a percentage (0–100).
 */
export function ruleOf2and4(outs: number, cardsToCome: 1 | 2): number {
  if (cardsToCome === 1) return outs * 2;
  const raw = outs * 4;
  return outs > 8 ? raw - (outs - 8) : raw;
}

// ---------------------------------------------------------------------------
// Equity (chance to win the pot) – exact enumeration vs a known hand, plus a
// Monte Carlo version used as an independent cross-check.
// ---------------------------------------------------------------------------
export interface Equity { win: number; tie: number; equity: number; trials: number }

export function equityExact(hero: Card[], villain: Card[], board: Card[]): Equity {
  const deck = remainingDeck([...hero, ...villain, ...board]);
  const need = 5 - board.length;
  let win = 0, tie = 0, n = 0;
  const run = (runout: Card[]) => {
    const full = [...board, ...runout];
    const d = evaluate([...hero, ...full]).score - evaluate([...villain, ...full]).score;
    if (d > 0) win++; else if (d === 0) tie++;
    n++;
  };
  if (need === 0) run([]);
  else if (need === 1) for (const c of deck) run([c]);
  else if (need === 2) for (let i = 0; i < deck.length; i++) for (let j = i + 1; j < deck.length; j++) run([deck[i], deck[j]]);
  else throw new Error('equityExact supports flop, turn or river boards');
  return { win: win / n, tie: tie / n, equity: (win + tie / 2) / n, trials: n };
}

export function equityMonteCarlo(hero: Card[], villain: Card[], board: Card[], trials: number, rng: Rng = Math.random): Equity {
  const deck = remainingDeck([...hero, ...villain, ...board]);
  const need = 5 - board.length;
  let win = 0, tie = 0;
  for (let t = 0; t < trials; t++) {
    // partial Fisher–Yates for `need` cards
    for (let i = 0; i < need; i++) {
      const j = i + Math.floor(rng() * (deck.length - i));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    const full = [...board, ...deck.slice(0, need)];
    const d = evaluate([...hero, ...full]).score - evaluate([...villain, ...full]).score;
    if (d > 0) win++; else if (d === 0) tie++;
  }
  return { win: win / trials, tie: tie / trials, equity: (win + tie / 2) / trials, trials };
}

// ---------------------------------------------------------------------------
// Pot odds
// ---------------------------------------------------------------------------
// Convention used everywhere in the app: `pot` is the pot BEFORE the opponent's
// bet. To call you put in `toCall` to win everything already in the middle.

export interface PotOdds {
  toCall: number;
  totalAfterCall: number; // pot + bet + your call
  requiredEquity: number; // 0..1 – the break-even chance of winning
  ratio: number; // "x to 1" pot odds: (pot + bet) : call
}

export function potOdds(pot: number, bet: number, toCall: number = bet): PotOdds {
  const totalAfterCall = pot + bet + toCall;
  return { toCall, totalAfterCall, requiredEquity: toCall / totalAfterCall, ratio: (pot + bet) / toCall };
}
