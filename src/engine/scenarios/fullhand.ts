import { type Card, type Rng, parseCards, pick } from '../cards';
import { HANDS, type HandSpec } from '../../data/hands';
import { type Format, FORMAT_SHORT, POS_NAME } from '../../data/positions';
import type { Question } from './types';

let counter = 0;
const bb = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)}bb`;
const STREET: Record<string, string> = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River' };

export function handToQuestions(h: HandSpec): Question {
  const hero = parseCards(h.hero) as [Card, Card];
  const id = `hand-${h.id}-${Date.now().toString(36)}-${counter++}`;
  let next: Question | undefined;
  for (let i = h.steps.length - 1; i >= 0; i--) {
    const s = h.steps[i];
    const prev = h.steps[i - 1];
    const last = i === h.steps.length - 1;
    const q: Question = {
      id: `${id}-${i}`,
      skill: 'fullhand',
      format: h.format,
      stepLabel: `${h.title} · ${i + 1} of ${h.steps.length}`,
      prompt: s.prompt,
      context: `${prev?.then ? `${prev.then} ` : ''}${STREET[s.street]} · Pot ${bb(s.pot)}${s.facing ? ` · To call ${bb(s.facing)}` : ''}. ${s.story}`,
      cardsView: { board: s.board ? parseCards(s.board) : [], hero },
      choices: s.choices,
      correct: s.correct,
      close: !!s.close,
      explanation: last ? `${s.explanation}\n\n**How it ended:** ${h.outcome}` : s.explanation,
      closeNote: s.closeNote,
      facts: {
        format: FORMAT_SHORT[h.format],
        hand: h.title,
        my_position: POS_NAME[h.heroPos],
        my_cards: h.hero,
        street: s.street,
        board: s.board || '(none yet)',
        pot: bb(s.pot),
        ...(s.facing ? { to_call: bb(s.facing) } : {}),
        story_so_far: h.steps.slice(0, i).map((x) => `${x.street}: ${x.story} ${x.then ?? ''}`).join(' | ') + ` | now: ${s.story}`,
      },
      followUp: next,
    };
    next = q;
  }
  return next!;
}

export function fullHandQuestion(format: Format, rng: Rng = Math.random): Question {
  const pool = HANDS.filter((h) => h.format === format);
  return handToQuestions(pick(pool.length ? pool : HANDS, rng));
}
