import { describe, expect, it } from 'vitest';
import { type Card, classOf, parseCards, remainingDeck, seededRng } from '../src/engine/cards';
import { CATEGORY_NAME, evaluate, compareHands } from '../src/engine/evaluator';
import { equityExact, exactHitChance, improvingCards, outsAgainst, potOdds, ruleOf2and4 } from '../src/engine/odds';
import { LESSONS } from '../src/data/lessons';
import { HANDS } from '../src/data/hands';
import { GLOSSARY } from '../src/data/glossary';
import { preflopAnswer } from '../src/engine/preflop';
import { buildDrawSpot, classifyDraw, type DrawKind } from '../src/engine/scenarios/drawspot';
import { outsQuestion } from '../src/engine/scenarios/outs';
import { potOddsQuestion } from '../src/engine/scenarios/potodds';
import { POSTFLOP_TEMPLATE_IDS, connectedness, isDry, isWet, maxSuitCount, postflopQuestion } from '../src/engine/scenarios/postflop';
import { fullHandQuestion, handToQuestions } from '../src/engine/scenarios/fullhand';
import type { Question } from '../src/engine/scenarios/types';

const P = parseCards;
const unique = (cs: Card[]) => new Set(cs).size === cs.length;
const links = (s: string) => [...s.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)].map((m) => m[1]);
const chain = (q: Question) => { const out: Question[] = []; for (let x: Question | undefined = q; x; x = x.followUp) out.push(x); return out; };
const checkLinks = (q: Question) => { for (const k of links(q.prompt + q.explanation + (q.closeNote ?? ''))) expect(GLOSSARY[k], `missing glossary key ${k}`).toBeDefined(); };

describe('lesson examples are correct', () => {
  it('every spot with an outs claim matches enumeration', () => {
    let n = 0;
    for (const l of LESSONS) for (const sc of l.screens) for (const b of sc.blocks) {
      if (b.t !== 'spot') continue;
      const all = [...P(b.hero), ...P(b.board), ...(b.villain ? P(b.villain) : [])];
      expect(unique(all), `duplicate card in ${b.caption}`).toBe(true);
      if (b.villain && b.outs != null) {
        expect(outsAgainst(P(b.hero), P(b.villain), P(b.board)).outs.length, b.caption).toBe(b.outs);
        n++;
      }
    }
    expect(n).toBeGreaterThanOrEqual(7);
  });
  it('lesson 5 board examples are the texture they claim', () => {
    expect(isDry(P('Ks 7d 2c'))).toBe(true);
    expect(isWet(P('9h 8h 6s'))).toBe(true);
    expect(evaluate(P('Ah Kd Kc 8s 3h')).category).toBe(1); // top pair
  });
  it('every lesson has 3–5 screens and a drill', () => {
    for (const l of LESSONS) { expect(l.available).toBe(true); expect(l.screens.length).toBeGreaterThanOrEqual(3); expect(l.screens.length).toBeLessThanOrEqual(5); expect(l.skill).not.toBeNull(); }
  });
});

describe('draw spots', () => {
  const kinds: DrawKind[] = ['flush', 'oesd', 'gutshot', 'overcards', 'combo'];
  for (const k of kinds)
    it(`${k}: 150 spots are legal, behind, and correctly classified`, () => {
      const rng = seededRng(k.length * 97);
      for (let i = 0; i < 150; i++) {
        const s = buildDrawSpot(i % 2 ? 'flop' : 'turn', rng, k);
        expect(unique([...s.hero, ...s.villain, ...s.board])).toBe(true);
        expect(classifyDraw(s.hero, s.board)).toBe(k);
        expect(compareHands([...s.villain, ...s.board], [...s.hero, ...s.board])).toBe(1); // villain ahead now
        expect(s.analysis.outs.length).toBe(outsAgainst(s.hero, s.villain, s.board).outs.length);
      }
    });
});

describe('outs drill', () => {
  it('1,000 two-step questions teach the right numbers', () => {
    const rng = seededRng(11);
    for (let i = 0; i < 1000; i++) {
      const q = outsQuestion(i % 2 ? 'fullring' : 'sixmax', rng);
      const [s1, s2] = chain(q);
      const v = s1.cardsView!;
      expect(unique([...v.hero, ...v.villain!, ...v.board])).toBe(true);
      const n = outsAgainst(v.hero, v.villain!, v.board).outs.length;
      expect(s1.correct).toBe(String(n));
      expect(s1.choices.map((c) => c.id)).toContain(s1.correct);
      expect(new Set(s1.choices.map((c) => c.id)).size).toBe(4);
      const cards = v.board.length === 3 ? 2 : 1;
      expect(s2.correct).toBe(String(ruleOf2and4(n, cards)));
      expect(Math.abs(ruleOf2and4(n, cards) - exactHitChance(n, cards) * 100)).toBeLessThanOrEqual(3);
      expect(new Set(s2.choices.map((c) => c.id)).size).toBe(4);
      checkLinks(s1); checkLinks(s2);
    }
  });
});

describe('pot-odds drill', () => {
  it('500 questions: the answer agrees with the exact equity vs the real hand, bets are sane', () => {
    const rng = seededRng(5);
    for (let i = 0; i < 500; i++) {
      const q = potOddsQuestion(i % 2 ? 'fullring' : 'sixmax', rng);
      const f = q.facts;
      const pot = parseFloat(f.pot_before_bet);
      const bet = parseFloat(f.opponent_bet);
      expect(bet).toBeGreaterThan(0);
      expect(bet).toBeLessThanOrEqual(pot * 1.25);
      expect(pot).toBeGreaterThanOrEqual(5);
      expect(pot).toBeLessThanOrEqual(60); // turn pots in 3-bet pots reach ~47bb
      const need = potOdds(pot, bet).requiredEquity;
      expect(f.required_equity).toBe(`${(need * 100).toFixed(1)}%`);
      const hit = parseFloat(f.my_chance_to_hit) / 100;
      expect(q.correct).toBe(hit >= need ? 'call' : 'fold');
      // The rule-of-thumb figure shown in the explanation agrees with the answer.
      const est = Number(q.explanation.match(/About (\d+)% is (more|less)/)![1]) / 100;
      expect(est >= need ? 'call' : 'fold').toBe(q.correct);
      checkLinks(q);
    }
  });
  it('turn decisions match the exact one-card equity against the hidden hand', () => {
    // Re-derive from a fresh spot to make sure "outs/46" and true equity give the same verdict.
    const rng = seededRng(99);
    for (let i = 0; i < 200; i++) {
      const s = buildDrawSpot('turn', rng);
      const eq = equityExact(s.hero, s.villain, s.board).equity;
      // Exact identity: equity = (outs + ½ × tying rivers) ÷ 44 unseen cards.
      const deck = remainingDeck([...s.hero, ...s.villain, ...s.board]);
      const ties = deck.filter((c) => evaluate([...s.hero, ...s.board, c]).score === evaluate([...s.villain, ...s.board, c]).score).length;
      expect(eq).toBeCloseTo((s.analysis.outs.length + ties / 2) / 44, 10);
    }
  });
});

describe('post-flop drill', () => {
  for (const id of POSTFLOP_TEMPLATE_IDS)
    it(`${id}: 120 deals fit the template`, () => {
      const rng = seededRng(id.length * 13);
      for (let i = 0; i < 120; i++) {
        const q = postflopQuestion(i % 2 ? 'fullring' : 'sixmax', rng, id);
        const { hero, board } = q.cardsView!;
        expect(unique([...hero, ...board])).toBe(true);
        expect(q.choices.map((c) => c.id)).toContain(q.correct);
        const cat = evaluate([...hero, ...board]).category;
        const want: Record<string, () => void> = {
          'cbet-dry': () => { expect(isDry(board)).toBe(true); expect(cat).toBe(0); },
          'no-cbet-wet-multiway': () => { expect(isWet(board)).toBe(true); expect(cat).toBe(0); },
          'value-top-pair': () => expect(cat).toBe(1),
          'strong-wet': () => { expect([2, 3]).toContain(cat); expect(maxSuitCount(board)).toBeGreaterThanOrEqual(2); },
          'semi-bluff': () => { expect(cat).toBe(0); expect(['flush', 'oesd', 'combo']).toContain(classifyDraw(hero, board)); },
          'call-draw-small-bet': () => {
            expect(cat).toBe(0);
            expect(['flush', 'combo']).toContain(classifyDraw(hero, board));
            // Same rule as the pot-odds drill: one-card chance must beat the price.
            const outs = improvingCards(hero, board, 4).length;
            const bet = parseFloat(q.facts.bet_facing), pot = parseFloat(q.facts.pot);
            expect(outs / 47).toBeGreaterThanOrEqual(potOdds(pot, bet).requiredEquity);
            expect(outs * 2 / 100).toBeGreaterThanOrEqual(potOdds(pot, bet).requiredEquity);
          },
          'top-pair-facing-bet': () => expect(cat).toBe(1),
          'fold-weak-pair-big-bet': () => { expect(cat).toBe(1); expect(classifyDraw(hero, board)).toBeNull(); },
          'no-river-bluff': () => { expect(board.length).toBe(5); expect(cat).toBe(0); },
          'river-value': () => { expect(board.length).toBe(5); expect(cat).toBe(1); expect(connectedness(board)).toBeLessThanOrEqual(3); },
        };
        want[id]();
        expect(q.facts.my_hand).toBe(CATEGORY_NAME[cat]);
        checkLinks(q);
      }
    });
});

describe('full-hand walkthroughs', () => {
  for (const h of HANDS)
    it(`${h.id}: cards, charts, claims, pots and showdown are all correct`, () => {
      const hero = P(h.hero);
      const finalBoard = h.steps[h.steps.length - 1].board;
      expect(unique([...hero, ...P(finalBoard), ...(h.showdown ? P(h.showdown.villain) : [])])).toBe(true);
      for (let i = 0; i < h.steps.length; i++) {
        const s = h.steps[i];
        const b = s.board ? P(s.board) : [];
        // Boards only grow street by street.
        if (i > 0 && h.steps[i - 1].board) expect(s.board.startsWith(h.steps[i - 1].board)).toBe(true);
        expect(s.choices.map((c) => c.id)).toContain(s.correct);
        if (s.claim) expect(CATEGORY_NAME[evaluate([...hero, ...b]).category], `${h.id} step ${i}`).toBe(s.claim);
        if (s.chart) expect(preflopAnswer(h.format, s.chart.situation, s.chart.pos, classOf(hero[0], hero[1])).action).toBe(s.correct);
        const next = h.steps[i + 1];
        if (next) expect(next.pot, `${h.id}: pot after step ${i}`).toBeCloseTo(s.pot + (s.added ?? 0) + (next.facing ?? 0), 5);
      }
      if (h.showdown) {
        const r = compareHands([...hero, ...P(h.showdown.board)], [...P(h.showdown.villain), ...P(h.showdown.board)]);
        expect(r === 1).toBe(h.showdown.heroWins);
      }
      for (const q of chain(handToQuestions(h))) checkLinks(q);
    });
  it('each format has at least two hands', () => {
    expect(HANDS.filter((h) => h.format === 'fullring').length).toBeGreaterThanOrEqual(2);
    expect(HANDS.filter((h) => h.format === 'sixmax').length).toBeGreaterThanOrEqual(2);
    expect(chain(fullHandQuestion('sixmax', seededRng(1))).length).toBeGreaterThanOrEqual(3);
  });
});
