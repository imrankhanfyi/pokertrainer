import { describe, expect, it } from 'vitest';
import { GLOSSARY } from '../src/data/glossary';
import { LESSONS } from '../src/data/lessons';
import { seededRng } from '../src/engine/cards';
import { SHORTCUTS, potOddsQuestion, shortcutNeed } from '../src/engine/scenarios/potodds';
import type { Question, WorkingVisual } from '../src/engine/scenarios/types';
import type { Format } from '../src/data/positions';

const FORMATS: Format[] = ['home6', 'sixmax', 'fullring'];
const links = (s: string) => [...s.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)].map((m) => m[1]);
const chain = (q: Question) => { const out: Question[] = []; for (let x: Question | undefined = q; x; x = x.followUp) out.push(x); return out; };

describe('pot odds: why the % is what it is', () => {
  for (const format of FORMATS) {
    it(`${format}: slice, tiles and shortcut steps are consistent`, () => {
      const rng = seededRng(77);
      let tilesSeen = 0, shortcutsSeen = 0;
      for (let i = 0; i < 500; i++) {
        const [s1, s2] = chain(potOddsQuestion(format, rng));
        const need = Number(s1.correct);
        const w = s1.working!;
        const slice = w.map((x) => x.visual).find((v) => v?.kind === 'slice') as Extract<WorkingVisual, { kind: 'slice' }>;
        expect(slice).toBeDefined();
        expect(slice.pct).toBe(need);
        const total = slice.mine + slice.others.reduce((t, o) => t + o.bb, 0);
        expect(Math.round((slice.mine / total) * 100)).toBe(need);
        const pot = parseFloat(s1.facts.pot_before_bet);
        const bet = parseFloat(s1.facts.opponent_bet);
        const allIn = s1.facts.opponent_bet.includes('all-in');

        const ratio = total / slice.mine;
        const n = Math.round(ratio);
        const wantTiles = n >= 2 && n <= 6 && Math.abs(ratio - n) <= 0.15;
        const tiles = w.map((x) => x.visual).find((v) => v?.kind === 'tiles') as Extract<WorkingVisual, { kind: 'tiles' }> | undefined;
        expect(!!tiles).toBe(wantTiles);
        if (tiles) {
          tilesSeen++;
          expect(tiles.n).toBe(n);
          expect(tiles.win).toBe(pot + bet);
          expect(tiles.lose).toBe(slice.mine);
          expect(Math.abs(tiles.win - (n - 1) * tiles.lose)).toBeLessThanOrEqual(0.2 * tiles.win);
        }

        const sc = SHORTCUTS.find((s) => Math.abs(bet / pot - s.f) <= 0.06);
        const scStep = w.find((x) => x.text.startsWith('Shortcut:'));
        expect(!!scStep).toBe(!!sc);
        if (!allIn) expect(sc).toBeDefined();
        if (sc && scStep) {
          shortcutsSeen++;
          expect(scStep.text).toContain(`**${shortcutNeed(sc.f)}%**`);
          expect(scStep.text).toContain(sc.words);
          expect(Math.abs(shortcutNeed(sc.f) - need)).toBeLessThanOrEqual(3);
          expect(s2.working![0].text).toContain(`about ${shortcutNeed(sc.f)}%`);
        } else {
          expect(s2.working![0].text).not.toContain('bet →');
        }
        for (const st of [...w, ...s2.working!]) for (const k of links(st.text)) expect(GLOSSARY[k], `missing glossary key ${k}`).toBeDefined();
      }
      expect(tilesSeen).toBeGreaterThan(0);
      expect(shortcutsSeen).toBeGreaterThan(300);
    });
  }

  it('shortcut table matches the pot-odds formula', () => {
    expect(SHORTCUTS.map((s) => shortcutNeed(s.f))).toEqual([20, 25, 29, 30, 33]);
  });

  it('lesson 4 visuals: slice is 25%, tiles are exactly even', () => {
    const blocks = LESSONS[3].screens.flatMap((s) => s.blocks).filter((b) => b.t === 'visual');
    const slice = blocks.map((b) => (b as { visual: WorkingVisual }).visual).find((v) => v.kind === 'slice');
    const tiles = blocks.map((b) => (b as { visual: WorkingVisual }).visual).find((v) => v.kind === 'tiles');
    expect(slice?.kind === 'slice' && slice.mine / (slice.mine + slice.others.reduce((t, o) => t + o.bb, 0))).toBe(0.25);
    expect(slice?.kind === 'slice' && slice.pct).toBe(25);
    expect(tiles?.kind === 'tiles' && tiles.win).toBe(tiles?.kind === 'tiles' ? (tiles.n - 1) * tiles.lose : -1);
  });
});
