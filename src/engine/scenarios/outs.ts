import { type Rng, showCard, showCards } from '../cards';
import { describeGroups, drawName } from '../draws';
import { equityExact, exactHitChance, ruleOf2and4 } from '../odds';
import type { Format } from '../../data/positions';
import { buildDrawSpot } from './drawspot';
import type { Question, WorkingStep } from './types';

let counter = 0;
const qid = () => `outs-${Date.now().toString(36)}-${counter++}`;
const pct = (x: number) => `${Math.round(x * 100)}%`;

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
  const exactPct = exact * 100;
  const lo = Math.floor(Math.min(est, exactPct) - 1);
  const hi = Math.ceil(Math.max(est, exactPct) + 1);
  const eq = equityExact(hero, villain, board);
  const fourCalc = n > 8 ? `${n} × 4 = ${n * 4}, minus ${n - 8} (you have more than 8 outs) = **${est}%**` : `${n} × 4 = **${est}%**`;
  const exactTxt = exactPct.toFixed(1);
  const working2: WorkingStep[] = [
    {
      text: cardsToCome === 2
        ? `Two cards to come, so use the [[rule-of-2-and-4|Rule of 4]]: ${fourCalc}.`
        : `One card to come, so use the [[rule-of-2-and-4|Rule of 2]]: ${n} × 2 = **${est}%**.`,
      visual: { kind: 'bars', need: est, needLabel: `About ${est}%` },
    },
    { text: `The exact chance of hitting an out is **${exactTxt}%**, so the shortcut is close.`, visual: { kind: 'bars', need: est, have: Math.min(100, exactPct), needLabel: 'Shortcut', haveLabel: 'Exact' } },
    { text: `Against ${showCards(villain)} your real chance of winning the pot is about **${pct(eq.equity)}**. Hitting an out is close to winning, which is good enough to decide with.` },
  ];
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
    choices: [],
    correct: String(est),
    close: false,
    numeric: { unit: '%', min: lo, max: hi, answerText: `about ${est}% (exactly ${exactTxt}%)`, decimal: true, placeholder: '%' },
    working: working2,
    explanation: cardsToCome === 2
      ? `Multiply your ${n} outs by 4 (less ${Math.max(0, n - 8)} when you have more than 8). The exact chance is ${exactTxt}%.`
      : `Multiply your ${n} outs by 2. The exact chance is ${exactTxt}%.`,
    closeNote: cardsToCome === 2 ? 'Use ×4 only if you’ll see both cards for this price (for example, when someone is all-in). If there will be another bet on the turn, use ×2 for one card at a time.' : undefined,
    facts: {
      street,
      my_cards: showCards(hero),
      board: showCards(board),
      outs: String(n),
      rule_of_2_and_4_estimate: `${est}%`,
      exact_chance_to_hit: `${exactTxt}%`,
      accepted_range: `${lo}% to ${hi}%`,
    },
  };

  // ---- Step 1: count outs ----
  const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  const dirtyReason = a.dirty.length ? a.dirty[0].why : '';
  const working1: WorkingStep[] = [
    {
      text: `Your ${name}: these unseen cards make you the winner.`,
      visual: {
        kind: 'cards',
        groups: a.groups.map((g) => ({ label: `${cap(g.label)} (${g.cards.length})`, cards: g.cards })),
        dead: a.dirty.length ? { label: `Don’t count: ${dirtyReason}`, cards: a.dirty.map((d) => d.card) } : undefined,
      },
    },
    {
      text: a.groups.length > 1
        ? `${a.groups.map((g) => g.cards.length).join(' + ')} = **${n} outs**.${a.dirty.length ? ` The ${a.dirty.length} grey card${a.dirty.length > 1 ? 's' : ''} are [[dirty-outs|dirty outs]], so leave them out.` : ''}`
        : `That’s **${n} outs**.${a.dirty.length ? ` The ${a.dirty.length} grey card${a.dirty.length > 1 ? 's' : ''} are [[dirty-outs|dirty outs]], so leave them out.` : ''}`,
    },
  ];
  const step1: Question = {
    id: qid(),
    skill: 'outs',
    format,
    stepLabel: 'Step 1 of 2',
    prompt: `Your opponent has ${spot.villainDesc}. How many [[outs]] do you have?`,
    context: `${street === 'flop' ? 'Flop' : 'Turn'}. You have ${showCards(hero)}; they have ${showCards(villain)}.`,
    cardsView: { board, hero, villain, villainLabel: 'Them' },
    choices: [],
    correct: String(n),
    close: false,
    numeric: { unit: 'outs', min: n, max: n, answerText: `${n} outs`, placeholder: 'outs' },
    working: working1,
    explanation: `You have a ${name}, which gives ${n} outs.${a.dirty.length ? ' Some cards that look like outs would hand your opponent a better hand.' : ''}`,
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
