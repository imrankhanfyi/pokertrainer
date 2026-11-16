import { describe, expect, it } from 'vitest';
import { HANDS } from '../src/data/hands';
import { type Format, positionsFor, postflopOrder } from '../src/data/positions';
import { fullHandQuestion, handToQuestions } from '../src/engine/scenarios/fullhand';
import { POSTFLOP_TEMPLATE_IDS, postflopQuestion } from '../src/engine/scenarios/postflop';
import type { Question } from '../src/engine/scenarios/types';
import { seededRng } from '../src/engine/cards';

function checkOrder(q: Question, format: Format, facingOk: boolean) {
  const o = q.order!;
  expect(o).toBeDefined();
  const pre = positionsFor(format);
  const want = o.street === 'preflop' ? pre : postflopOrder(pre);
  expect(o.seats.map((s) => s.pos)).toEqual(want);
  const heroIdx = o.seats.findIndex((s) => s.status === 'hero');
  expect(o.seats.filter((s) => s.status === 'hero').length).toBe(1);
  expect(heroIdx).toBeGreaterThanOrEqual(0);
  // Hero's own seat. Facing a bet postflop, the bettor may sit after you (you checked first).
  if (!facingOk) o.seats.forEach((s, i) => { if (i > heroIdx) expect(s.status).not.toBe('acted'); });
  // Everyone after you who is still in is 'waiting', never 'acted' (unless you face a bet).
  if (o.street !== 'preflop') expect(o.seats.filter((s) => s.status !== 'folded' && s.status !== 'hero').length).toBeGreaterThan(0);
}

describe('order-of-play data', () => {
  for (const id of POSTFLOP_TEMPLATE_IDS)
    it(`post-flop ${id}: order is complete and in street order for every format`, () => {
      const rng = seededRng(id.length * 7);
      for (const f of ['home6', 'sixmax', 'fullring'] as Format[])
        for (let i = 0; i < 25; i++) {
          const q = postflopQuestion(f, rng, id);
          expect(q.format).toBe(f);
          expect(q.order!.seats.length).toBe(f === 'fullring' ? 9 : 6);
          checkOrder(q, f, !!q.facts.bet_facing);
          expect(q.order!.seats.find((s) => s.status === 'hero')!.pos).toBe(q.facts.my_position);
        }
    });

  for (const h of HANDS)
    it(`full hand ${h.id}: every step has a valid order`, () => {
      let q: Question | undefined = handToQuestions(h);
      let n = 0;
      while (q) {
        const step = h.steps[n++];
        checkOrder(q, h.format, q.order!.street !== 'preflop' && !!step.facing);
        expect(q.order!.street).toBe(step.street);
        expect(q.order!.seats.find((s) => s.status === 'hero')!.pos).toBe(h.heroPos);
        step.acted.forEach((p) => expect(step.inHand).toContain(p));
        q = q.followUp;
      }
      expect(n).toBe(h.steps.length);
    });

  it('closeAlternatives only on close steps and are valid choice ids', () => {
    for (const h of HANDS)
      for (const s of h.steps) if (s.closeAlternatives) {
        expect(s.close).toBe(true);
        for (const c of s.closeAlternatives) expect(s.choices.map((x) => x.id)).toContain(c);
        expect(s.closeAlternatives).not.toContain(s.correct);
      }
  });

  it('home6 generates post-flop and full-hand questions', () => {
    const rng = seededRng(5);
    for (let i = 0; i < 30; i++) {
      const p = postflopQuestion('home6', rng);
      expect(p.format).toBe('home6');
      const h = fullHandQuestion('home6', rng);
      const hand = HANDS.find((x) => h.id.startsWith(`hand-${x.id}-`))!;
      expect(h.format).toBe(hand.format);
      expect(h.facts.note).toContain('game');
      expect(h.order!.seats.length).toBe(hand.format === 'fullring' ? 9 : 6);
    }
  });
});
