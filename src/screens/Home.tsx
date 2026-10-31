import { LESSONS } from '../data/lessons';
import type { Format } from '../data/positions';
import { SKILLS } from '../engine/scenarios/types';
import { Icon, Segmented } from '../ui/components';
import { useApp } from '../ui/state';

export function FormatToggle() {
  const { state, update } = useApp();
  return (
    <Segmented<Format>
      label="Table format"
      value={state.settings.format}
      onChange={(f) => update((s) => ({ ...s, settings: { ...s.settings, format: f } }))}
      options={[{ id: 'fullring', label: 'Full ring · home game' }, { id: 'sixmax', label: '6-max · online' }]}
    />
  );
}

export function Home({ go }: { go: (p: string) => void }) {
  const { state } = useApp();
  const nextLesson = LESSONS.find((l) => l.available && !state.lessons[l.id]?.done) ?? LESSONS[0];
  const done = LESSONS.filter((l) => state.lessons[l.id]?.done).length;
  return (
    <div className="screen">
      <h1>Practice</h1>
      <p className="muted">Quick reps, calm feedback. Stop whenever you like.</p>
      <FormatToggle />
      <div className="stack" style={{ marginTop: 16 }}>
        <button className="tile hero-tile" onClick={() => go('/practice/mix')}>
          <div className="tile-body">
            <div className="tile-title" style={{ fontSize: 20 }}>Mix it up</div>
            <div className="tile-sub">A bit of everything, with more of what you find tricky</div>
          </div>
          <span className="chev">{Icon.chev}</span>
        </button>
        {SKILLS.map((s) => {
          const st = state.stats[s.id];
          return (
            <button key={s.id} className="tile" onClick={() => go(`/practice/${s.id}`)}>
              <div className="tile-body">
                <div className="tile-title">{s.title}</div>
                <div className="tile-sub">{s.blurb}{st && st.seen > 0 ? ` · ${Math.round((st.correct / st.seen) * 100)}% right` : ''}</div>
              </div>
              <span className="chev">{Icon.chev}</span>
            </button>
          );
        })}
      </div>

      <h2>Lessons</h2>
      <button className="tile" onClick={() => go(`/lesson/${nextLesson.id}`)}>
        <div className="tile-num">{nextLesson.id}</div>
        <div className="tile-body">
          <div className="tiny">{done === 0 ? 'Start here' : 'Up next'}</div>
          <div className="tile-title">{nextLesson.title}</div>
          <div className="tile-sub">{nextLesson.summary}</div>
        </div>
        <span className="chev">{Icon.chev}</span>
      </button>
      <button className="btn ghost" onClick={() => go('/lessons')} style={{ marginTop: 6 }}>All lessons</button>
    </div>
  );
}
