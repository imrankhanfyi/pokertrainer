import { describe, expect, it } from 'vitest';
import { ALL_CLASSES, seededRng } from '../src/engine/cards';
import { type Format, chartPositions, positionsFor } from '../src/data/positions';
import { SIZING, isoSize, type Situation } from '../src/data/ranges';
import { comparableNeighbours, getChart, gridNeighbours, preflopAnswer } from '../src/engine/preflop';
import { preflopQuestion } from '../src/engine/scenarios/preflop';
import { positionsQuestion } from '../src/engine/scenarios/positions';
import { gradeAnswer } from '../src/engine/scenarios/types';

const FORMATS: Format[] = ['home6', 'fullring', 'sixmax'];
const SITS: Situation[] = ['open', 'limpers', 'raise'];

/** Generate questions until one matches (the hero seat is random). */
function findQuestion(format: Format, situation: Situation, hand: string, heroPos: string, seed = 1) {
  const rng = seededRng(seed);
  for (let i = 0; i < 500; i++) {
    const q = preflopQuestion(format, rng, { situation, hand });
    if (q.table!.heroPos === heroPos) return q;
  }
  throw new Error(`no ${format} ${situation} question with hero ${heroPos}`);
}

describe('big blind facing limpers checks (spec §2.1)', () => {
  for (const f of FORMATS) {
    it(`${f}: K5s and 72o check, never fold`, () => {
      for (const hc of ['K5s', '72o']) expect(preflopAnswer(f, 'limpers', 'BB', hc).action, hc).toBe('call');
      for (const hc of ALL_CLASSES) expect(preflopAnswer(f, 'limpers', 'BB', hc).action, hc).not.toBe('fold');
    });
    it(`${f}: the drill shows K5s in the big blind as "Check", and folding is a mistake`, () => {
      const q = findQuestion(f, 'limpers', 'K5s', 'BB');
      expect(q.correct).toBe('call');
      expect(q.choices.find((c) => c.id === 'call')!.label).toBe('Check');
      expect(gradeAnswer(q, 'fold')).toBe('mistake');
      expect(q.explanation).toMatch(/never fold/i);
    });
    it(`${f}: 'fold' is never a close alternative in the big blind facing limpers`, () => {
      for (const hc of ALL_CLASSES) expect(preflopAnswer(f, 'limpers', 'BB', hc).closeAlternatives).not.toContain('fold');
    });
  }

  it('the drill is mostly about the raise/check line, not obvious checks', () => {
    for (const f of FORMATS) {
      const rng = seededRng(5);
      let n = 0, obvious = 0, close = 0, calls = 0;
      for (let i = 0; i < 4000; i++) {
        const q = preflopQuestion(f, rng, { situation: 'limpers' });
        if (q.table!.heroPos !== 'BB') continue;
        n++;
        if (q.close) close++;
        if (q.correct === 'call') calls++;
        if (q.correct === 'call' && !q.close) obvious++;
      }
      expect(n).toBeGreaterThan(300);
      // Measured 2026-11-16 (6,000 seeded questions): checks 49–51% (the chart is ~92% checks),
      // obvious checks 16–19%, on the raise/check line 59–61%.
      expect(obvious / n, `${f} obvious checks`).toBeLessThan(0.25);
      expect(close / n, `${f} on the raise/check line`).toBeGreaterThan(0.5);
      expect(calls / n, `${f} checks overall`).toBeLessThan(0.6);
    }
  });
});

describe('close calls use 13×13 grid neighbours (spec §2.3)', () => {
  it('neighbours are the orthogonal cells of the chart', () => {
    expect(gridNeighbours('AKs').sort()).toEqual(['AA', 'AQs', 'KK']);
    expect(gridNeighbours('AQo').sort()).toEqual(['AJo', 'AKo', 'KQo']);
    expect(gridNeighbours('22').sort()).toEqual(['32o', '32s']);
    expect(gridNeighbours('T9s').sort()).toEqual(['99', 'J9s', 'T8s', 'TT']);
  });

  it('pairs compare with pairs, other hands with non-pairs', () => {
    expect(comparableNeighbours('KK').sort()).toEqual(['AA', 'QQ']);
    expect(comparableNeighbours('22')).toEqual(['33']);
    expect(comparableNeighbours('AKs').sort()).toEqual(['AQs']);
    expect(comparableNeighbours('AKo').sort()).toEqual(['AQo']);
    expect(comparableNeighbours('T9s').sort()).toEqual(['J9s', 'T8s']);
  });

  it('folding a premium hand is never a close call', () => {
    for (const f of FORMATS) for (const s of SITS) for (const p of chartPositions(f)) {
      if (!getChart(f, s, p)) continue;
      for (const hc of ['AA', 'KK', 'QQ', 'AKs', 'AKo']) {
        const a = preflopAnswer(f, s, p, hc);
        if (a.action === 'raise') expect(a.closeAlternatives, `${f}/${s}/${p} ${hc}`).not.toContain('fold');
      }
    }
    expect(preflopAnswer('home6', 'raise', 'BB', 'KK').close).toBe(false);
    expect(preflopAnswer('fullring', 'raise', 'EP', 'AKo').closeAlternatives).not.toContain('fold');
    expect(preflopAnswer('home6', 'raise', 'BTN', 'QQ').closeAlternatives).toEqual(['call']); // JJ calls
    expect(preflopAnswer('home6', 'limpers', 'BB', '88').closeAlternatives).toEqual(['raise']); // 99 raises
  });

  it('blinds get close calls too: home6 big blind facing a raise with AQo', () => {
    const a = preflopAnswer('home6', 'raise', 'BB', 'AQo');
    expect(a.action).toBe('call');
    expect(a.close).toBe(true);
    expect(a.closeAlternatives.sort()).toEqual(['raise']); // AKo re-raises; AJo and KQo also call
  });

  it('the big blind facing a raise defends every hand the button would cold-call (it gets the best price)', () => {
    for (const f of ['home6', 'sixmax', 'fullring'] as const) {
      for (const hc of ALL_CLASSES) {
        if (preflopAnswer(f, 'raise', 'BTN', hc).action === 'call') expect(preflopAnswer(f, 'raise', 'BB', hc).action, `${f} ${hc}`).not.toBe('fold');
      }
    }
  });

  it('a hand surrounded by the same action is not close', () => {
    expect(preflopAnswer('home6', 'open', 'UTG', '72o').close).toBe(false);
    expect(preflopAnswer('home6', 'raise', 'BTN', 'AA').close).toBe(false);
  });

  it('close ⇔ a neighbour differs by one step, and alternatives are exactly those neighbours\' actions', () => {
    for (const f of FORMATS) for (const s of SITS) for (const p of chartPositions(f)) {
      if (!getChart(f, s, p)) continue;
      for (const hc of ALL_CLASSES) {
        const a = preflopAnswer(f, s, p, hc);
        expect(a.closeAlternatives).not.toContain(a.action);
        const fromNeighbours = new Set(a.neighbours.map((n) => n.action));
        if (s === 'limpers' && p === 'BB') fromNeighbours.delete('fold');
        if (s !== 'open' && a.action !== 'call') fromNeighbours.delete(a.action === 'raise' ? 'fold' : 'raise'); // one step only
        expect(new Set(a.closeAlternatives)).toEqual(fromNeighbours);
        expect(a.close).toBe(a.closeAlternatives.length > 0);
      }
    }
  });

  it('home6 is compared with 6-max, the others with home6', () => {
    expect(preflopAnswer('home6', 'open', 'UTG', 'AA').otherFormat?.format).toBe('sixmax');
    expect(preflopAnswer('sixmax', 'open', 'UTG', 'AA').otherFormat?.format).toBe('home6');
    expect(preflopAnswer('fullring', 'open', 'EP', 'AA').otherFormat).toMatchObject({ format: 'home6', pos: 'UTG' });
  });
});

describe('preflop questions carry v2 data', () => {
  for (const f of FORMATS) {
    it(`${f}: close alternatives, chart and order oval on 3,000 questions`, () => {
      const rng = seededRng(9);
      let maxLimpers = 0;
      for (let i = 0; i < 3000; i++) {
        const q = preflopQuestion(f, rng);
        const t = q.table!;
        // closeAlternatives
        expect(q.closeAlternatives).toBeDefined();
        expect(q.closeAlternatives!.length > 0).toBe(q.close);
        expect(q.closeAlternatives).not.toContain(q.correct);
        for (const alt of q.closeAlternatives!) expect(gradeAnswer(q, alt)).toBe('close');
        expect(gradeAnswer(q, q.correct)).toBe('right');
        if (q.close) expect(q.closeNote).toMatch(/This is close/);
        // chart
        expect(q.chart!.format).toBe(f);
        expect(preflopAnswer(f, q.chart!.situation, q.chart!.pos, q.chart!.hand).action).toBe(q.correct);
        expect(q.facts.hand).toContain(`(${q.chart!.hand})`);
        // order oval
        const o = q.order!;
        expect(o.street).toBe('preflop');
        expect(o.seats.map((s) => s.pos)).toEqual(positionsFor(f));
        const hi = o.seats.findIndex((s) => s.status === 'hero');
        expect(o.seats.filter((s) => s.status === 'hero').length).toBe(1);
        expect(o.seats[hi].pos).toBe(t.heroPos);
        for (let j = 0; j < hi; j++) expect(['acted', 'folded']).toContain(o.seats[j].status);
        for (let j = hi + 1; j < o.seats.length; j++) expect(o.seats[j].status).toBe('waiting');
        const acted = o.seats.filter((s) => s.status === 'acted').length;
        expect(acted).toBe(t.seats.filter((s) => s.state === 'limped' || s.state === 'raised').length);
        if (q.facts.situation === 'Facing limpers') maxLimpers = Math.max(maxLimpers, acted);
      }
      expect(maxLimpers).toBe(f === 'sixmax' ? 2 : 3);
    });
  }

  it('home6 uses home-game sizing and describes the game', () => {
    expect(SIZING.home6.open).toBe(3);
    expect(isoSize('home6', 2)).toBe(6);
    const q = preflopQuestion('home6', seededRng(3));
    expect(q.facts.format).toMatch(/6-handed live home game, loose-passive/);
  });
});

describe('positions drill', () => {
  it('home6 deals 6 seats and never shows an order oval that would give the answer away', () => {
    const rng = seededRng(4);
    for (let i = 0; i < 500; i++) {
      const q = positionsQuestion('home6', rng);
      expect(q.table!.seats.length).toBe(6);
      expect(q.order).toBeUndefined();
    }
  });
});
