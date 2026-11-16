import { describe, expect, it } from 'vitest';
import { remainingDeck, seededRng } from '../src/engine/cards';
import { outsQuestion } from '../src/engine/scenarios/outs';
import { potOddsQuestion } from '../src/engine/scenarios/potodds';
import type { Question } from '../src/engine/scenarios/types';
import type { Format } from '../src/data/positions';

const chain = (q: Question) => { const out: Question[] = []; for (let x: Question | undefined = q; x; x = x.followUp) out.push(x); return out; };
const FORMATS: Format[] = ['home6', 'fullring', 'sixmax'];

describe('v2 working visuals', () => {
  it('outs: card groups are unseen cards and add up to the outs count', () => {
    const rng = seededRng(21);
    for (let i = 0; i < 500; i++) {
      const [s1] = chain(outsQuestion(FORMATS[i % 3], rng));
      const v = s1.cardsView!;
      const unseen = new Set(remainingDeck([...v.hero, ...v.villain!, ...v.board]));
      const vis = s1.working![0].visual!;
      expect(vis.kind).toBe('cards');
      if (vis.kind !== 'cards') continue;
      const all = vis.groups.flatMap((g) => g.cards);
      for (const c of [...all, ...(vis.dead?.cards ?? [])]) expect(unseen.has(c)).toBe(true);
      expect(new Set([...all, ...(vis.dead?.cards ?? [])]).size).toBe(all.length + (vis.dead?.cards.length ?? 0));
      expect(all.length).toBe(s1.numeric!.min);
      expect(s1.working![1].text).toContain(`**${s1.numeric!.min} outs**`);
    }
  });

  it('pot odds: chips sum to the total, bars are 0-100, every format generates', () => {
    const rng = seededRng(22);
    for (let i = 0; i < 400; i++) {
      const steps = chain(potOddsQuestion(FORMATS[i % 3], rng));
      expect(steps.length).toBe(2);
      expect(steps.map((s) => s.stepLabel)).toEqual(['Step 1 of 2', 'Step 2 of 2']);
      for (const st of steps) for (const w of st.working ?? []) {
        const v = w.visual;
        if (v?.kind === 'bars') for (const x of [v.need, v.have ?? 0]) { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(100); }
        if (v?.kind === 'chips') {
          const sum = v.parts.reduce((t, p) => t + p.bb, 0);
          const need = steps[0].numeric!;
          expect(v.parts.filter((p) => p.mine).length).toBe(1);
          const mine = v.parts.find((p) => p.mine)!.bb;
          expect(mine / sum * 100).toBeGreaterThanOrEqual(need.min - 2);
          expect(mine / sum * 100).toBeLessThanOrEqual(need.max + 2);
        }
      }
    }
  });
});
