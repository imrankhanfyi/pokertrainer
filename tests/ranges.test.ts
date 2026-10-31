import { describe, expect, it } from 'vitest';
import { ALL_CLASSES, classOf, seededRng } from '../src/engine/cards';
import { chartPositions, type Format } from '../src/data/positions';
import { RANGES, type Situation } from '../src/data/ranges';
import { parseRange } from '../src/data/ranges/notation';
import { getChart } from '../src/engine/preflop';
import { preflopQuestion } from '../src/engine/scenarios/preflop';
import { positionsQuestion } from '../src/engine/scenarios/positions';

const FORMATS: Format[] = ['fullring', 'sixmax'];
const SITS: Situation[] = ['open', 'limpers', 'raise'];

describe('range notation', () => {
  it('parses the common shorthands', () => {
    expect([...parseRange('QQ+')].sort()).toEqual(['AA', 'KK', 'QQ']);
    expect([...parseRange('ATs+')].sort()).toEqual(['AJs', 'AKs', 'AQs', 'ATs']);
    expect(parseRange('A2s-A5s').size).toBe(4);
    expect([...parseRange('AK')].sort()).toEqual(['AKo', 'AKs']);
    expect([...parseRange('96s+')].sort()).toEqual(['96s', '97s', '98s']);
    expect(parseRange('22-66').size).toBe(5);
  });
  it('rejects junk', () => {
    expect(() => parseRange('AZs')).toThrow();
    expect(() => parseRange('KAs')).toThrow();
  });
});

describe('range tables', () => {
  for (const f of FORMATS)
    for (const s of SITS)
      for (const p of chartPositions(f)) {
        const spec = RANGES[f][s][p];
        if (!spec) continue;
        it(`${f}/${s}/${p} parses, uses only real hands, and raise/call don't overlap`, () => {
          const c = getChart(f, s, p)!;
          for (const h of [...c.raise, ...c.call]) expect(ALL_CLASSES).toContain(h);
          for (const h of c.raise) expect(c.call.has(h)).toBe(false);
          expect(c.raise.size).toBeGreaterThan(0);
        });
      }

  for (const f of FORMATS) {
    it(`${f}: opening ranges only widen from early position to the button`, () => {
      const seats = chartPositions(f).filter((p) => p !== 'SB' && p !== 'BB');
      for (let i = 1; i < seats.length; i++) {
        const prev = getChart(f, 'open', seats[i - 1])!.raise;
        const cur = getChart(f, 'open', seats[i])!.raise;
        for (const h of prev) expect(cur.has(h), `${h} opens from ${seats[i - 1]} but not ${seats[i]}`).toBe(true);
      }
    });
    it(`${f}: premium hands (AA, KK, AKs) always raise in every chart`, () => {
      for (const s of SITS)
        for (const p of chartPositions(f)) {
          const c = getChart(f, s, p);
          if (!c) continue;
          for (const h of ['AA', 'KK', 'AKs']) expect(c.raise.has(h), `${f}/${s}/${p} ${h}`).toBe(true);
        }
    });
    it(`${f}: 72o is always a fold (or a free check from the big blind)`, () => {
      for (const s of SITS) for (const p of chartPositions(f)) {
        const c = getChart(f, s, p);
        if (c) { expect(c.raise.has('72o')).toBe(false); expect(c.call.has('72o')).toBe(false); }
      }
    });
  }

  it('6-max opening ranges are at least as wide as full ring from the same seat', () => {
    const pairs: [string, string][] = [['EP', 'UTG'], ['MP', 'HJ'], ['CO', 'CO'], ['BTN', 'BTN']];
    for (const [fr, sm] of pairs) {
      const a = getChart('fullring', 'open', fr as never)!.raise;
      const b = getChart('sixmax', 'open', sm as never)!.raise;
      for (const h of a) expect(b.has(h), `${h}: full ring ${fr} opens but 6-max ${sm} doesn't`).toBe(true);
    }
  });
});

describe('generated scenarios are legal and consistent', () => {
  for (const f of FORMATS) {
    it(`${f}: 5,000 preflop questions`, () => {
      const rng = seededRng(f === 'fullring' ? 1 : 2);
      for (let i = 0; i < 5000; i++) {
        const q = preflopQuestion(f, rng);
        const t = q.table!;
        // Hero is dealt two distinct cards matching the stated class.
        expect(t.heroCards![0]).not.toBe(t.heroCards![1]);
        expect(q.facts.hand).toContain(`(${classOf(t.heroCards![0], t.heroCards![1])})`);
        // Exactly one hero seat, and all seats before the hero have acted.
        const hi = t.seats.findIndex((s) => s.state === 'hero');
        expect(t.seats.filter((s) => s.state === 'hero').length).toBe(1);
        for (let j = 0; j < hi; j++) expect(['folded', 'limped', 'raised']).toContain(t.seats[j].state);
        // Pot = blinds + limps + raise; sensible size.
        const raised = t.seats.filter((s) => s.state === 'raised');
        expect(raised.length).toBeLessThanOrEqual(1);
        expect(t.pot!).toBeGreaterThanOrEqual(1.5);
        expect(t.pot!).toBeLessThanOrEqual(7);
        // The correct answer is one of the choices.
        expect(q.choices.map((c) => c.id)).toContain(q.correct);
        // Never a limp answer when folded to us.
        if (q.context === 'Everyone has folded to you.') expect(q.correct).not.toBe('call');
        expect(q.explanation.length).toBeGreaterThan(40);
      }
    });
    it(`${f}: 2,000 positions questions`, () => {
      const rng = seededRng(7);
      for (let i = 0; i < 2000; i++) {
        const q = positionsQuestion(f, rng);
        const ids = q.choices.map((c) => c.id);
        expect(ids).toContain(q.correct);
        expect(new Set(ids).size).toBe(ids.length);
      }
    });
  }
});
