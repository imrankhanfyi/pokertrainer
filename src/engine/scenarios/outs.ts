import { type Rng, showCard, showCards, shuffled } from '../cards';
import { describeGroups, drawName } from '../draws';
import { equityExact, exactHitChance, ruleOf2and4 } from '../odds';
import type { Format } from '../../data/positions';
import { buildDrawSpot, textbookCount } from './drawspot';
import type { Question } from './types';

let counter = 0;
const qid = () => `outs-${Date.now().toString(36)}-${counter++}`;
const pct = (x: number) => `${Math.round(x * 100)}%`;

function pickDistinct(correct: number, cands: number[], n: number, rng: Rng, min = 1, max = 30): number[] {
  const out = new Set<number>([correct]);
  for (const c of shuffled(cands, rng)) if (out.size < n && c >= min && c <= max) out.add(c);
  for (let d = 1; out.size < n; d++) for (const c of [correct + d, correct - d]) if (out.size < n && c >= min && c <= max) out.add(c);
  return [...out].sort((a, b) => a - b);
}

export function outsQuestion(format: Format, rng: Rng = Math.random): Question {
  const street = rng() < 0.65 ? 'flop' : 'turn';
  const spot = buildDrawSpot(street, rng);
  const { analysis: a, hero, villain, board } = spot;
  const n = a.outs.length;
  const name = drawName(a.groups, hero, board);
  const cardsToCome = street === 'flop' ? 2 : 1;

  // ---- Step 2: outs → percentage ----
  const est = ruleOf2and4(n, cardsToCome);
  const exact = exactHitChance(n, cardsToCome);
  const wrongMult = cardsToCome === 2 ? n * 2 : n * 4;
  const pctOpts = pickDistinct(est, [wrongMult, n, est + 20, Math.max(2, est - 15)], 4, rng, 1, 95);
  const eq = equityExact(hero, villain, board);
  const fourCalc = n > 8 ? `${n} × 4 = ${n * 4}, minus ${n - 8} (because you have more than 8 outs) = ${est}%` : `${n} × 4 = ${est}%`;
  const step2: Question = {
    id: qid(),
    skill: 'outs',
    format,
    stepLabel: 'Step 2 of 2',
    prompt: cardsToCome === 2
      ? `You have ${n} outs on the flop. Roughly what’s your chance of hitting one by the river?`
      : `You have ${n} outs on the turn. Roughly what’s your chance of hitting one on the river?`,
    context: cardsToCome === 2 ? 'Two cards to come (turn and river).' : 'One card to come.',
    cardsView: { board, hero },
    choices: pctOpts.map((p) => ({ id: String(p), label: `About ${p}%` })),
    correct: String(est),
    close: false,
    explanation:
      (cardsToCome === 2
        ? `[[rule-of-2-and-4|Rule of 4]] with two cards to come: ${fourCalc}. `
        : `[[rule-of-2-and-4|Rule of 2]] with one card to come: ${n} × 2 = ${est}%. `) +
      `The exact figure is ${(exact * 100).toFixed(1)}%. ` +
      `Against ${showCards(villain)} your real chance of winning the pot is ${pct(eq.equity)} – hitting isn’t quite the same as winning, but it’s close enough to decide with.`,
    closeNote: cardsToCome === 2 ? 'Use ×4 only if you’ll see both cards for this price (for example, when someone is all-in). If there will be another bet on the turn, use ×2 for one card at a time.' : undefined,
    facts: {
      street,
      my_cards: showCards(hero),
      board: showCards(board),
      outs: String(n),
      rule_of_2_and_4_estimate: `${est}%`,
      exact_chance_to_hit: `${(exact * 100).toFixed(1)}%`,
    },
  };

  // ---- Step 1: count outs ----
  const outsOpts = pickDistinct(n, [textbookCount(spot.kind), n + a.dirty.length, n + 3, n - 3, n + 6], 4, rng, 1, 22);
  const dirtyText = a.dirty.length
    ? ` Not counted: ${a.dirty.map((d) => showCard(d.card)).join(' ')} – ${a.dirty[0].why}. Those are [[dirty-outs|dirty outs]].`
    : '';
  const step1: Question = {
    id: qid(),
    skill: 'outs',
    format,
    stepLabel: 'Step 1 of 2',
    prompt: `Your opponent has ${spot.villainDesc}. How many [[outs]] do you have?`,
    context: `${street === 'flop' ? 'Flop' : 'Turn'}. You have ${showCards(hero)}; they have ${showCards(villain)}.`,
    cardsView: { board, hero, villain, villainLabel: 'Them' },
    choices: outsOpts.map((o) => ({ id: String(o), label: `${o} outs` })),
    correct: String(n),
    close: false,
    explanation: `You have a ${name}: ${describeGroups(a.groups)}. That’s ${n} outs.${dirtyText}`,
    closeNote: spot.kind === 'combo' && n < 17
      ? 'Don’t just add 9 + 8 = 17: the flush cards that also complete your straight would be counted twice.'
      : spot.kind === 'overcards' ? 'Overcards are weaker outs than they look: pairing up can still lose to two pair or a set later, so many players count them as about 3 instead of 6.' : undefined,
    facts: {
      street,
      my_cards: showCards(hero),
      opponent_cards: `${showCards(villain)} (${spot.villainDesc})`,
      board: showCards(board),
      draw: name,
      outs_by_enumeration: `${n}: ${describeGroups(a.groups, 20)}`,
      dirty_outs: a.dirty.map((d) => `${showCard(d.card)} ${d.why}`).join('; ') || 'none',
    },
    followUp: step2,
  };
  return step1;
}
