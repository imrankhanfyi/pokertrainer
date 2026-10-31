import { describe, expect, it } from 'vitest';
import { GLOSSARY } from '../src/data/glossary';
import { LESSONS } from '../src/data/lessons';
import { seededRng } from '../src/engine/cards';
import { preflopQuestion } from '../src/engine/scenarios/preflop';
import { positionsQuestion } from '../src/engine/scenarios/positions';
import { parseCards } from '../src/engine/cards';

const linkKeys = (s: string) => [...s.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)].map((m) => m[1]);

function allLessonText(): string[] {
  const out: string[] = [];
  for (const l of LESSONS)
    for (const sc of l.screens)
      for (const b of sc.blocks) {
        if (b.t === 'p' || b.t === 'tip') out.push(b.text);
        if (b.t === 'list') out.push(...b.items);
        if (b.t === 'format') out.push(b.fullring, b.sixmax);
        if ('caption' in b && b.caption) out.push(b.caption);
      }
  return out;
}

describe('content integrity', () => {
  it('every [[glossary]] link in lessons resolves', () => {
    for (const t of allLessonText()) for (const k of linkKeys(t)) expect(GLOSSARY[k], `missing glossary key "${k}"`).toBeDefined();
  });
  it('every [[glossary]] link in generated explanations resolves', () => {
    const rng = seededRng(3);
    for (let i = 0; i < 3000; i++) {
      for (const q of [preflopQuestion(i % 2 ? 'fullring' : 'sixmax', rng), positionsQuestion(i % 2 ? 'fullring' : 'sixmax', rng)])
        for (const k of linkKeys(q.explanation + (q.closeNote ?? ''))) expect(GLOSSARY[k], `missing glossary key "${k}"`).toBeDefined();
    }
  });
  it('lesson card examples are valid cards', () => {
    for (const l of LESSONS) for (const sc of l.screens) for (const b of sc.blocks) if (b.t === 'cards') expect(() => parseCards(b.cards)).not.toThrow();
  });
  it('available lessons have 3–5 screens and a linked drill', () => {
    for (const l of LESSONS.filter((x) => x.available)) {
      expect(l.screens.length).toBeGreaterThanOrEqual(3);
      expect(l.screens.length).toBeLessThanOrEqual(5);
      expect(l.skill).not.toBeNull();
    }
  });
});
