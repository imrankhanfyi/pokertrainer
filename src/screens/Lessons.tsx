import { useEffect, useState } from 'react';
import { type Block, LESSONS } from '../data/lessons';
import { type Pos, FORMAT_SHORT, positionsFor, postflopOrder, zoneOf } from '../data/positions';
import { parseCards } from '../engine/cards';
import { exactHitChance, potOdds, ruleOf2and4 } from '../engine/odds';
import type { TableVisual } from '../engine/scenarios/types';
import { Cards, Icon, Rich, TopBar } from '../ui/components';
import { PokerTable } from '../ui/PokerTable';
import { RangeGrid } from '../ui/RangeGrid';
import { back, useApp } from '../ui/state';
import { FormatToggle } from './Home';

export function LessonList({ go }: { go: (p: string) => void }) {
  const { state } = useApp();
  const avail = LESSONS.filter((l) => l.available);
  const done = avail.filter((l) => state.lessons[l.id]?.done).length;
  return (
    <div className="screen">
      <h1>Lessons</h1>
      <p className="muted">Suggested order below – open any lesson at any time.</p>
      <div className="progress" aria-label={`${done} of ${avail.length} lessons done`}><div style={{ width: `${(done / Math.max(1, avail.length)) * 100}%` }} /></div>
      <div className="tiny" style={{ margin: '6px 0 14px' }}>{done} of {avail.length} read</div>
      <div className="stack">
        {LESSONS.map((l, i) => {
          const d = state.lessons[l.id]?.done;
          return (
            <button key={l.id} className="tile" onClick={() => l.available && go(`/lesson/${l.id}`)} disabled={!l.available} style={l.available ? undefined : { opacity: 0.6 }}>
              <div className={`tile-num${d ? ' done' : ''}`} aria-label={d ? 'Done' : undefined}>{d ? '✓' : l.id}</div>
              <div className="tile-body">
                {i === 0 && <div className="tiny">Start here</div>}
                <div className="tile-title">{l.title}</div>
                <div className="tile-sub">{l.available ? l.summary : 'Coming soon'}</div>
              </div>
              {l.available && <span className="chev">{Icon.chev}</span>}
            </button>
          );
        })}
      </div>
      <button className="btn ghost" style={{ marginTop: 12 }} onClick={() => go('/glossary')}>Glossary of poker terms</button>
    </div>
  );
}

const ZONE_SHORT = { early: 'Early', middle: 'Middle', late: 'Late', blinds: 'Blind' } as const;

function BlockView({ b }: { b: Block }) {
  const { state } = useApp();
  const format = state.settings.format;
  switch (b.t) {
    case 'p': return <p><Rich text={b.text} /></p>;
    case 'tip': return <div className="tip"><Rich text={b.text} /></div>;
    case 'list': return <ul className="lesson-list">{b.items.map((x, i) => <li key={i}><Rich text={x} /></li>)}</ul>;
    case 'format': return <div className="format-box"><div className="tiny">Showing: {FORMAT_SHORT[format]} (change on the Practice tab)</div><Rich text={format === 'fullring' ? b.fullring : b.sixmax} /></div>;
    case 'spot': return (
      <figure className="figure">
        <div className="cards-view" style={{ textAlign: 'left' }}>
          {b.villain && <div className="cv-row"><span className="cv-label">Them</span><Cards cards={parseCards(b.villain)} size="sm" /></div>}
          <div className="cv-row"><span className="cv-label">Board</span><Cards cards={parseCards(b.board)} size="md" /></div>
          <div className="cv-row"><span className="cv-label">You</span><Cards cards={parseCards(b.hero)} size="md" /></div>
        </div>
        <figcaption><Rich text={b.caption} /></figcaption>
      </figure>
    );
    case 'oddsTable': return (
      <table className="mini-table">
        <thead><tr><th>Outs</th><th>Turn→river<br /><span className="tiny">×2 · exact</span></th><th>Flop→river<br /><span className="tiny">×4 · exact</span></th></tr></thead>
        <tbody>{b.outs.map((o) => (
          <tr key={o}><td><strong>{o}</strong></td>
            <td>{ruleOf2and4(o, 1)}% · {(exactHitChance(o, 1) * 100).toFixed(1)}%</td>
            <td>{ruleOf2and4(o, 2)}% · {(exactHitChance(o, 2) * 100).toFixed(1)}%</td></tr>
        ))}</tbody>
      </table>
    );
    case 'potTable': return (
      <table className="mini-table">
        <thead><tr><th>They bet</th><th>Example</th><th>You need</th></tr></thead>
        <tbody>{([[1 / 3, '⅓ pot'], [1 / 2, '½ pot'], [2 / 3, '⅔ pot'], [3 / 4, '¾ pot'], [1, 'Pot']] as [number, string][]).map(([f, l]) => {
          const p = potOdds(30, 30 * f);
          return <tr key={l}><td><strong>{l}</strong></td><td>{30 * f}bb into 30bb</td><td><strong>{Math.round(p.requiredEquity * 100)}%</strong></td></tr>;
        })}</tbody>
      </table>
    );
    case 'cards': return <figure className="figure"><Cards cards={parseCards(b.cards)} size="lg" /><figcaption>{b.caption}</figcaption></figure>;
    case 'chart': return <><RangeGrid format={format} situation={b.situation} />{b.caption && <div className="tiny" style={{ textAlign: 'center' }}>{b.caption}</div>}</>;
    case 'order': {
      const pre = positionsFor(format);
      const post = postflopOrder(pre);
      const Row = ({ items }: { items: Pos[] }) => (
        <div className="order-row">{items.flatMap((p, i) => (i ? [<span key={`a${i}`} className="arrow">→</span>, <span key={p}>{p}</span>] : [<span key={p}>{p}</span>]))}</div>
      );
      return (
        <figure className="figure">
          <div className="tiny">Before the flop</div><Row items={pre} />
          <div className="tiny">Flop, turn and river</div><Row items={post} />
          {b.caption && <figcaption>{b.caption}</figcaption>}
        </figure>
      );
    }
    case 'table': {
      const t: TableVisual = {
        seats: positionsFor(format).map((pos) => ({ pos, state: b.highlight?.includes(pos) ? 'raised' : 'waiting', highlight: b.highlight?.includes(pos) })),
      };
      return (
        <figure className="figure">
          <PokerTable t={t} zones={b.zones ? (p) => ZONE_SHORT[zoneOf(format, p)] : undefined} />
          {b.caption && <figcaption>{b.caption}</figcaption>}
        </figure>
      );
    }
  }
}

export function LessonView({ id, go }: { id: number; go: (p: string) => void }) {
  const lesson = LESSONS.find((l) => l.id === id && l.available);
  const { state, update } = useApp();
  const [i, setI] = useState(() => Math.min(state.lessons[id]?.screen ?? 0, (lesson?.screens.length ?? 1) - 1));
  useEffect(() => { window.scrollTo({ top: 0 }); }, [i]);
  if (!lesson) return <div className="screen"><TopBar title="Lesson" onBack={back} /><p>This lesson isn’t available yet.</p></div>;
  const last = i === lesson.screens.length - 1;
  const sc = lesson.screens[i];
  const save = (screen: number, done = false) =>
    update((s) => ({ ...s, lessons: { ...s.lessons, [id]: { screen, done: done || !!s.lessons[id]?.done } } }));
  return (
    <div className="screen no-tabs">
      <TopBar title={`${lesson.id}. ${lesson.title}`} onBack={back} />
      <div className="dots" aria-label={`Screen ${i + 1} of ${lesson.screens.length}`}>
        {lesson.screens.map((_, j) => <span key={j} className={j === i ? 'on' : ''} />)}
      </div>
      {sc.blocks.some((b) => b.t === 'format' || b.t === 'chart' || b.t === 'table' || b.t === 'order') && <div style={{ margin: '4px 0 8px' }}><FormatToggle /></div>}
      <div className="lesson-screen" key={i}>
        <h2>{sc.title}</h2>
        {sc.blocks.map((b, j) => <BlockView key={j} b={b} />)}
      </div>
      <div className="row" style={{ marginTop: 20 }}>
        {i > 0 && <button className="btn" onClick={() => { setI(i - 1); save(i - 1); }}>Back</button>}
        {!last ? (
          <button className="btn primary" onClick={() => { setI(i + 1); save(i + 1); }}>Next</button>
        ) : (
          <button className="btn primary" onClick={() => { save(i, true); go(`/practice/${lesson.skill}`); }}>Practise this →</button>
        )}
      </div>
      {last && <button className="btn ghost" style={{ marginTop: 6 }} onClick={() => { save(i, true); go('/lessons'); }}>Mark as read</button>}
    </div>
  );
}
