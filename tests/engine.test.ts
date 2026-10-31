import { describe, expect, it } from 'vitest';
import { ALL_CLASSES, FULL_DECK, classOf, combosIn, parseCards, seededRng, type Card } from '../src/engine/cards';
import { Category, compareHands, evaluate } from '../src/engine/evaluator';
import { equityExact, equityMonteCarlo, exactHitChance, outsAgainst, potOdds, ruleOf2and4 } from '../src/engine/odds';

const P = parseCards;

describe('hand evaluator', () => {
  it('produces the textbook category counts over all 2,598,960 five-card hands', () => {
    const counts = new Array(9).fill(0);
    const d = FULL_DECK;
    for (let a = 0; a < 52; a++)
      for (let b = a + 1; b < 52; b++)
        for (let c = b + 1; c < 52; c++)
          for (let e = c + 1; e < 52; e++)
            for (let f = e + 1; f < 52; f++) counts[evaluate([d[a], d[b], d[c], d[e], d[f]]).category]++;
    expect(counts).toEqual([1302540, 1098240, 123552, 54912, 10200, 5108, 3744, 624, 40]);
  });

  it('recognises the wheel and ranks it below a six-high straight', () => {
    const wheel = evaluate(P('As 2d 3c 4h 5s'));
    expect(wheel.category).toBe(Category.Straight);
    expect(compareHands(P('6s 2d 3c 4h 5s'), P('As 2d 3c 4h 5d'))).toBe(1);
  });

  it('uses kickers correctly', () => {
    expect(compareHands(P('As Ad Kc 7h 2s'), P('Ah Ac Qc 7d 2c'))).toBe(1);
    expect(compareHands(P('Ks Kd 9c 9h As'), P('Kh Kc 9d 9s Qh'))).toBe(1); // two pair, ace kicker
    expect(compareHands(P('Ks Kd 9c 9h As'), P('Kh Kc 9d 9s Ah'))).toBe(0); // chop
  });

  it('picks the best five of seven', () => {
    // Board pairs twice: three pair on board -> best two pair + best kicker.
    const v = evaluate(P('Ah 2c Kd Ks 8h 8c 3d'));
    expect(v.category).toBe(Category.TwoPair);
    // Two sets of trips make a full house using the higher trips.
    expect(evaluate(P('9h 9c 9d 4s 4h 4c As')).category).toBe(Category.FullHouse);
    expect(compareHands(P('9h 9c 9d 4s 4h 4c As'), P('9h 9c 9d 4s 4h 2c As'))).toBe(0);
    // Straight flush beats a higher plain straight on the same board.
    expect(evaluate(P('5h 6h 7h 8h 9h Tc Jd')).category).toBe(Category.StraightFlush);
    expect(evaluate(P('Ah Kh Qh Jh Th 9c 2d')).category).toBe(Category.StraightFlush);
  });

  it('a flush beats a straight and a full house beats a flush', () => {
    expect(compareHands(P('2h 5h 9h Jh Kh'), P('9s Tc Jd Qh Ks'))).toBe(1);
    expect(compareHands(P('2h 2c 2d 3s 3h'), P('Ah Kh Qh Jh 9h'))).toBe(1);
  });
});

describe('starting-hand classes', () => {
  it('has 169 classes totalling 1,326 combos', () => {
    expect(new Set(ALL_CLASSES).size).toBe(169);
    expect(ALL_CLASSES.reduce((s, h) => s + combosIn(h), 0)).toBe(1326);
  });
  it('classifies hole cards', () => {
    expect(classOf('Kh', 'As')).toBe('AKo');
    expect(classOf('7d', 'Td')).toBe('T7s');
    expect(classOf('7d', '7s')).toBe('77');
  });
});

describe('outs counting (enumeration against a specific hand)', () => {
  it('nut flush draw + an overcard ace vs top pair = 9 hearts + 3 aces = 12 outs', () => {
    const r = outsAgainst(P('Ah 5h'), P('Ks Qd'), P('Kh 8h 2c'));
    // An ace gives us a pair of aces, which beats their pair of kings.
    expect(r.outs.length).toBe(12);
    expect(r.unseen).toBe(45);
  });

  it('open-ended straight draw = 8 outs', () => {
    const r = outsAgainst(P('9c 8d'), P('Ks Kd'), P('7h 6s 2c'));
    expect(r.outs.length).toBe(8);
  });

  it('gutshot = 4 outs', () => {
    const r = outsAgainst(P('9c 8d'), P('As Ad'), P('Jh 7s 2c'));
    expect(r.outs.length).toBe(4); // any ten
  });

  it('flush draw + open-ender combo = 15 outs, not 17', () => {
    const r = outsAgainst(P('9h 8h'), P('As Ad'), P('7h 6h 2c'));
    // 9 hearts + 4 fives + 4 tens − the 5♥ and T♥ already counted = 15.
    expect(r.outs.length).toBe(15);
  });

  it('two overcards vs a weak pair = 6 outs', () => {
    const r = outsAgainst(P('Ac Kd'), P('8s 7s'), P('8h 5c 2d'));
    expect(r.outs.length).toBe(6);
  });

  it('dirty outs: a flush card that pairs the board is not an out against a set', () => {
    // Opponent has a set of queens. Nine hearts are left, but Q♥ gives them four of a kind.
    const r = outsAgainst(P('Ah Kh'), P('Qs Qd'), P('Qc 7h 2h'));
    expect(r.outs).not.toContain('Qh');
    expect(r.outs.length).toBe(8);
    expect(r.outs.every((c) => c[1] === 'h')).toBe(true);
  });
});

describe('rule of 2 and 4 vs exact maths', () => {
  it('×4 is within 3 percentage points of the exact chance for up to 8 outs', () => {
    for (let outs = 1; outs <= 8; outs++) {
      const exact = exactHitChance(outs, 2) * 100;
      expect(Math.abs(ruleOf2and4(outs, 2) - exact)).toBeLessThanOrEqual(3);
    }
  });
  it('with the "minus (outs − 8)" correction stays within 3 points up to 15 outs', () => {
    for (let outs = 9; outs <= 15; outs++) {
      const exact = exactHitChance(outs, 2) * 100;
      expect(Math.abs(ruleOf2and4(outs, 2) - exact)).toBeLessThanOrEqual(3);
    }
  });
  it('×2 is within 3 points of the exact one-card chance up to 15 outs', () => {
    for (let outs = 1; outs <= 15; outs++) {
      const exact = exactHitChance(outs, 1) * 100;
      expect(Math.abs(ruleOf2and4(outs, 1) - exact)).toBeLessThanOrEqual(3);
    }
  });
  it('known values: 9 outs ≈ 35% by the river, ≈ 19.6% on one card', () => {
    expect(exactHitChance(9, 2)).toBeCloseTo(0.3497, 3);
    expect(exactHitChance(9, 1)).toBeCloseTo(9 / 46, 6);
  });
});

describe('equity: exact enumeration agrees with Monte Carlo', () => {
  const cases: [string, string, string][] = [
    ['Ah 5h', 'Ks Qd', 'Kh 8h 2c'],
    ['9h 8h', 'As Ad', '7h 6h 2c'],
    ['Ac Kd', '8s 7s', '8h 5c 2d'],
    ['Jc Tc', 'Ad Kd', '9s 8s 2h Qd'],
  ];
  for (const [h, v, b] of cases) {
    it(`${h} vs ${v} on ${b}`, () => {
      const ex = equityExact(P(h), P(v), P(b));
      const mc = equityMonteCarlo(P(h), P(v), P(b), 40000, seededRng(42));
      expect(Math.abs(ex.equity - mc.equity)).toBeLessThan(0.015);
    });
  }
  it('a plain flush draw (no overcard) has ~35–40% equity vs top pair on the flop', () => {
    const e = equityExact(P('6h 5h'), P('Ks Qd'), P('Kh 8h 2c'));
    expect(e.equity).toBeGreaterThan(0.33);
    expect(e.equity).toBeLessThan(0.40);
  });
});

describe('pot odds', () => {
  it('half-pot bet requires 25% equity', () => {
    const p = potOdds(100, 50);
    expect(p.requiredEquity).toBeCloseTo(0.25, 10);
    expect(p.ratio).toBe(3);
  });
  it('pot-sized bet requires 33.3%', () => {
    expect(potOdds(60, 60).requiredEquity).toBeCloseTo(1 / 3, 10);
  });
  it('third-pot bet requires 20%', () => {
    expect(potOdds(90, 30).requiredEquity).toBeCloseTo(0.2, 10);
  });
});

// Ensure the type is used (keeps noUnusedLocals happy in strict builds).
export type _C = Card;
