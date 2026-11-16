import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { gradeAnswer, type Question } from '../src/engine/scenarios/types';
import { OrderOval, orderSummary } from '../src/ui/OrderOval';
import { Working } from '../src/ui/Working';
import { ChartAfterMiss } from '../src/ui/ChartAfterMiss';
import { scenarioMessage } from '../src/lib/openai';
import { FORMATS } from '../src/data/positions';

const base = { id: 'x', skill: 'preflop', format: 'home6', prompt: '', choices: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }], correct: 'a', close: false, explanation: '', facts: {} } as unknown as Question;

describe('v2 UI helpers', () => {
  it('grades right / close / mistake and typed numbers', () => {
    const q = { ...base, closeAlternatives: ['b'] };
    expect(gradeAnswer(q, 'a')).toBe('right');
    expect(gradeAnswer(q, 'b')).toBe('close');
    expect(gradeAnswer(q, 'c')).toBe('mistake');
    const n = { ...base, choices: [], numeric: { unit: 'outs', min: 12, max: 12, answerText: '12 outs' } } as Question;
    expect(gradeAnswer(n, '12')).toBe('right');
    expect(gradeAnswer(n, '9')).toBe('mistake');
  });
  it('format switcher cycles through all three formats', () => {
    expect(new Set(FORMATS).size).toBe(3);
  });
  it('order oval: 6 and 9 seats, aria label and caption', () => {
    const seats6 = (['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'] as const).map((pos, i) => ({ pos, status: (i < 3 ? (i === 2 ? 'hero' : 'folded') : 'waiting') as 'hero' | 'folded' | 'waiting' }));
    seats6[0].status = 'acted' as never;
    const o = { seats: seats6, street: 'preflop' as const };
    expect(orderSummary(o).label).toBe('Preflop: you act 3rd of 6; 3 still to act after you');
    expect(orderSummary(o).caption).toBe('You act 3rd · 3 to come');
    const html = renderToStaticMarkup(createElement(OrderOval, { order: o }));
    expect(html).toContain('aria-label="Preflop: you act 3rd of 6');
    expect(html.match(/<circle/g)!.length).toBe(7); // 6 seats + hero ring
    expect(html).toContain('>D<');
    const seats9 = ['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'].map((pos, i) => ({ pos, status: i === 4 ? 'hero' : 'acted' })) as never;
    expect(renderToStaticMarkup(createElement(OrderOval, { order: { seats: seats9, street: 'preflop' } }))).toContain('<svg');
  });
  it('working steps start with one step and offer Next step / Show all', () => {
    const steps = [
      { text: 'one', visual: { kind: 'bars' as const, need: 33, have: 44 } },
      { text: 'two', visual: { kind: 'chips' as const, parts: [{ label: 'Pot', bb: 5.5 }, { label: 'Call', bb: 5.5, mine: true }] } },
    ];
    const html = renderToStaticMarkup(createElement(Working, { steps }));
    expect(html).toContain('one');
    expect(html).not.toContain('two');
    expect(html).toContain('Next step');
    expect(html).toContain('Show all');
    expect(html).toContain('Need 33%');
    expect(renderToStaticMarkup(createElement(Working, { steps: [steps[0]] }))).not.toContain('Next step');
  });
  it('chart after a miss is collapsed by default', () => {
    const html = renderToStaticMarkup(createElement(ChartAfterMiss, { chart: { format: 'sixmax', situation: 'open', pos: 'BTN', hand: 'K5s' } }));
    expect(html).toContain('See the whole chart');
    expect(html).not.toContain('grid13');
  });
  it('scenarioMessage tells the AI a close call is not a mistake', () => {
    const m = scenarioMessage({}, { yourAnswer: 'Call', recommended: 'Raise', explanation: 'x', reasoning: 'cheap', grade: 'close' });
    expect(m).toContain('CLOSE CALL');
    expect(m).not.toContain("isn't that right");
  });
});
