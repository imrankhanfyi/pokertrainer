import { type Rng, pick, showCards } from '../cards';
import { drawName } from '../draws';
import { equityExact, exactHitChance, potOdds } from '../odds';
import { type Format, FORMAT_SHORT } from '../../data/positions';
import { buildDrawSpot } from './drawspot';
import type { Question } from './types';

let counter = 0;
const qid = () => `po-${Date.now().toString(36)}-${counter++}`;
const bb = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)}bb`;
const half = (n: number) => Math.max(1, Math.round(n * 2) / 2);
const pct1 = (x: number) => `${(x * 100).toFixed(1)}%`;

/** Realistic flop pot sizes (bb) for each format: heads-up single-raised, 3-way, 3-bet pot. */
const FLOP_POTS: Record<Format, number[]> = {
  fullring: [7.5, 7.5, 10.5, 13.5, 16], // home games: lots of multiway, limped and iso-raised pots
  sixmax: [5.5, 5.5, 6.5, 8.5, 20],
};
const BET_FRACTIONS: [number, string][] = [[1 / 3, 'a third of the pot'], [1 / 2, 'half the pot'], [2 / 3, 'two-thirds of the pot'], [3 / 4, 'three-quarters of the pot'], [1, 'the size of the pot']];

export function potOddsQuestion(format: Format, rng: Rng = Math.random): Question {
  for (let attempt = 0; attempt < 200; attempt++) {
    const street = rng() < 0.55 ? 'flop' : 'turn';
    const allIn = street === 'flop' && rng() < 0.35;
    const spot = buildDrawSpot(street, rng);
    const n = spot.analysis.outs.length;
    const flopPot = pick(FLOP_POTS[format], rng);
    let pot = flopPot;
    if (street === 'turn') pot = half(flopPot + 2 * half(flopPot * pick([1 / 3, 1 / 2, 2 / 3], rng)));
    const [frac, fracText] = pick(BET_FRACTIONS, rng);
    const bet = allIn ? half(pot * (0.6 + rng() * 0.6)) : half(pot * frac);
    const po = potOdds(pot, bet);
    const cards = allIn ? 2 : 1;
    // What the student can work out: outs → chance to hit (exact, from their point of view).
    const hit = exactHitChance(n, cards as 1 | 2, street === 'flop' ? 47 : 46);
    const estimate = cards === 2 ? (n > 8 ? 4 * n - (n - 8) : 4 * n) : 2 * n;
    // Ground truth vs the opponent's actual hand. With one card to come it's the exact
    // equity; when someone is all-in on the flop it's the two-card equity.
    const eq = street === 'turn' ? equityExact(spot.hero, spot.villain, spot.board).equity
      : allIn ? equityExact(spot.hero, spot.villain, spot.board).equity
      : n / 45; // flop, one card at a time: exact chance the turn is an out vs their real hand
    const callByHit = hit >= po.requiredEquity;
    const callByTruth = eq >= po.requiredEquity;
    // Never teach a decision that the real cards would contradict, and skip coin-flips
    // so close that rounding decides them.
    if (callByHit !== callByTruth) continue;
    // …and the rule-of-thumb estimate the student uses must point the same way.
    if (estimate / 100 >= po.requiredEquity !== callByHit) continue;
    if (Math.abs(hit - po.requiredEquity) < 0.01) continue;
    const margin = hit - po.requiredEquity;
    const correct = callByHit ? 'call' : 'fold';
    const name = drawName(spot.analysis.groups, spot.hero, spot.board);
    const close = Math.abs(margin) < 0.04 || (!allIn && correct === 'fold' && margin > -0.08);

    const step = `Price: call ${bb(po.toCall)} to win ${bb(pot + bet)} (the ${bb(pot)} pot + their ${bb(bet)} bet). You need to win ${bb(po.toCall)} ÷ ${bb(po.totalAfterCall)} = **${Math.round(po.requiredEquity * 100)}%** of the time.`;
    const chance = cards === 2
      ? `Your chance: ${n} outs, two cards to come because they’re all-in → about ${estimate}% (exactly ${pct1(hit)}).`
      : `Your chance: ${n} outs, one card at a time → ${n} × 2 ≈ ${estimate}% (exactly ${pct1(hit)}).`;
    const need = Math.round(po.requiredEquity * 100);
    const verdict = correct === 'call'
      ? `About ${estimate}% is more than ${need}%, so calling makes money in the long run.`
      : `About ${estimate}% is less than ${need}%, so calling loses money in the long run. Fold.`;
    let note: string | undefined;
    if (!allIn && correct === 'fold' && margin > -0.08)
      note = `Close: the direct price is a little short, but [[implied-odds|implied odds]] can make this a call against an opponent who will pay you off when you hit. ${format === 'fullring' ? 'Loose home-game players often do.' : 'Online regulars are more careful, so lean towards folding.'}`;
    else if (Math.abs(margin) < 0.04) note = 'Close: the price and your chances are nearly equal, so neither choice costs much.';
    if (spot.analysis.dirty.length && !note) note = `Watch out: ${spot.analysis.dirty.length} of the cards that complete your draw would also give your opponent a better hand, so they don’t count.`;

    return {
      id: qid(),
      skill: 'potodds',
      format,
      prompt: allIn ? `Your opponent goes all-in for ${bb(bet)}. Call or fold?` : `Your opponent bets ${fracText}. Call or fold?`,
      context: `${street === 'flop' ? 'Flop' : 'Turn'} · Pot ${bb(pot)} · They bet ${bb(bet)} · You have a ${name} (${n} outs)`,
      cardsView: { board: spot.board, hero: spot.hero },
      choices: [{ id: 'fold', label: 'Fold' }, { id: 'call', label: 'Call', sub: bb(po.toCall) }],
      correct,
      close,
      explanation: `${step} ${chance} ${verdict}`,
      closeNote: note,
      facts: {
        format: FORMAT_SHORT[format],
        street,
        my_cards: showCards(spot.hero),
        board: showCards(spot.board),
        draw: `${name}, ${n} outs (counted against the opponent's likely hand: ${spot.villainDesc})`,
        pot_before_bet: bb(pot),
        opponent_bet: `${bb(bet)}${allIn ? ' (all-in)' : ''}`,
        required_equity: `${(po.requiredEquity * 100).toFixed(1)}%`,
        my_chance_to_hit: pct1(hit),
      },
    };
  }
  throw new Error('Could not build a pot-odds question');
}
