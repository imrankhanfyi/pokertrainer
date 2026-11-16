import { type Rng, pick, showCards } from '../cards';
import { drawName } from '../draws';
import { equityExact, exactHitChance, potOdds } from '../odds';
import { type Format, FORMAT_SHORT } from '../../data/positions';
import { buildDrawSpot } from './drawspot';
import type { Question, WorkingStep } from './types';

let counter = 0;
const qid = () => `po-${Date.now().toString(36)}-${counter++}`;
const bb = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)}bb`;
const half = (n: number) => Math.max(1, Math.round(n * 2) / 2);
const pct1 = (x: number) => `${(x * 100).toFixed(1)}%`;

/** Realistic flop pot sizes (bb) for each format: heads-up single-raised, 3-way, 3-bet pot. */
const FLOP_POTS: Record<Format, number[]> = {
  home6: [5.5, 7.5, 7.5, 10.5, 13.5], // loose-passive 6-handed home game: limped/multiway pots like full ring, but fewer players
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

    const need = Math.round(po.requiredEquity * 100);
    if (estimate >= need !== (correct === 'call')) continue; // shown verdict must agree with the rounded figures
    const needExact = po.requiredEquity * 100;
    const name = drawName(spot.analysis.groups, spot.hero, spot.board);
    const close = Math.abs(margin) < 0.04 || (!allIn && correct === 'fold' && margin > -0.08);
    let note: string | undefined;
    if (!allIn && correct === 'fold' && margin > -0.08)
      note = `Close: the direct price is a little short, but [[implied-odds|implied odds]] can make this a call against an opponent who will pay you off when you hit. ${format !== 'sixmax' ? 'Loose home-game players often do.' : 'Online regulars are more careful, so lean towards folding.'}`;
    else if (Math.abs(margin) < 0.04) note = 'Close: the price and your chances are nearly equal, so neither choice costs much.';
    if (spot.analysis.dirty.length && !note) note = `Watch out: ${spot.analysis.dirty.length} of the cards that complete your draw would also give your opponent a better hand, so they don’t count.`;

    const facts = {
      format: FORMAT_SHORT[format],
      street,
      my_cards: showCards(spot.hero),
      board: showCards(spot.board),
      draw: `${name}, ${n} outs (counted against the opponent's likely hand: ${spot.villainDesc})`,
      pot_before_bet: bb(pot),
      opponent_bet: `${bb(bet)}${allIn ? ' (all-in)' : ''}`,
      required_equity: `${(po.requiredEquity * 100).toFixed(1)}%`,
      my_chance_to_hit: pct1(hit),
    };
    const base = { skill: 'potodds' as const, format, cardsView: { board: spot.board, hero: spot.hero } };
    const context = `${street === 'flop' ? 'Flop' : 'Turn'} · Pot ${bb(pot)} · They bet ${bb(bet)} · You have a ${name} (${n} outs)`;

    const workingStep2: WorkingStep[] = [
      { text: `You need to win **${need}%** of the time to break even.`, visual: { kind: 'bars', need: needExact, needLabel: `Need ${need}%` } },
      {
        text: cards === 2
          ? `${n} outs, two cards to come because they’re all-in → about **${estimate}%**.`
          : `${n} outs, one card at a time → ${n} × 2 = about **${estimate}%**.`,
        visual: { kind: 'bars', need: needExact, have: Math.min(100, estimate), needLabel: `Need ${need}%`, haveLabel: `You have ${estimate}%` },
      },
      {
        text: correct === 'call'
          ? `${estimate}% clears the ${need}% line → **Call**.`
          : `${estimate}% is short of the ${need}% line → **Fold**.`,
      },
    ];
    const step2: Question = {
      ...base,
      id: qid(),
      stepLabel: 'Step 2 of 2',
      prompt: allIn ? `Your opponent goes all-in for ${bb(bet)}. Call or fold?` : `Your opponent bets ${fracText}. Call or fold?`,
      context,
      choices: [{ id: 'fold', label: 'Fold' }, { id: 'call', label: 'Call', sub: bb(po.toCall) }],
      correct,
      close,
      closeAlternatives: close ? [correct === 'call' ? 'fold' : 'call'] : undefined,
      explanation: correct === 'call'
        ? `Your chance (about ${estimate}%) is more than the ${need}% you need, so calling makes money in the long run.`
        : `Your chance (about ${estimate}%) is less than the ${need}% you need, so calling loses money in the long run.`,
      closeNote: note,
      working: workingStep2,
      facts,
    };

    const total = po.totalAfterCall;
    const step1: Question = {
      ...base,
      id: qid(),
      stepLabel: 'Step 1 of 2',
      prompt: allIn
        ? `Your opponent goes all-in for ${bb(bet)}. What % of the time do you need to win to call?`
        : `Your opponent bets ${fracText}. What % of the time do you need to win to call?`,
      context,
      choices: [],
      correct: String(need),
      close: false,
      numeric: { unit: '%', min: Math.floor(needExact - 2), max: Math.ceil(needExact + 2), answerText: `${need}%`, placeholder: '%' },
      working: [
        {
          text: `The pot is **${bb(pot)}** and they bet **${bb(bet)}**. Calling costs you **${bb(po.toCall)}**.`,
          visual: { kind: 'chips', parts: [{ label: 'Pot', bb: pot }, { label: 'Their bet', bb: bet }, { label: 'Your call', bb: po.toCall, mine: true }] },
        },
        {
          text: `You pay **${po.toCall}** to play for **${total}** → you need **${need}%**.`,
          visual: { kind: 'bars', need: needExact, needLabel: `Need ${need}%` },
        },
      ],
      explanation: `You put in ${bb(po.toCall)} to play for ${bb(total)}, so you need to win ${bb(po.toCall)} ÷ ${bb(total)} = ${need}% of the time.`,
      facts: { ...facts, accepted_range: `${Math.floor(needExact - 2)}% to ${Math.ceil(needExact + 2)}%` },
      followUp: step2,
    };
    return step1;
  }
  throw new Error('Could not build a pot-odds question');
}
