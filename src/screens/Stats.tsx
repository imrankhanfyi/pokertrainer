import { LESSONS } from '../data/lessons';
import { SKILLS } from '../engine/scenarios/types';
import { isInstalledApp } from '../lib/storage';
import { useApp } from '../ui/state';
import { StorageNote } from './Settings';

export function Stats() {
  const { state } = useApp();
  return (
    <div className="screen">
      <h1>Progress</h1>
      <p className="muted">Just for you – no streaks, no pressure.</p>
      {!isInstalledApp() && <StorageNote />}
      <div className="card-section">
        {SKILLS.map((s) => {
          const st = state.stats[s.id];
          const pct = st && st.seen ? Math.round((st.correct / st.seen) * 100) : null;
          const recent = st?.recent ?? [];
          const rpct = recent.length ? Math.round((recent.reduce((a, b) => a + b, 0) / recent.length) * 100) : null;
          return (
            <div className="stat" key={s.id}>
              <div className="top"><strong>{s.title}</strong><span className="muted small">{st?.seen ?? 0} answered</span></div>
              <div className="progress" aria-hidden="true"><div style={{ width: `${pct ?? 0}%` }} /></div>
              <div className="tiny" style={{ marginTop: 4 }}>
                {pct == null ? 'Not practised yet' : `${pct}% right overall${rpct != null ? ` · ${rpct}% in your last ${recent.length}` : ''}`}
              </div>
            </div>
          );
        })}
      </div>
      <h2>Lessons</h2>
      <div className="card-section">
        {LESSONS.filter((l) => l.available).map((l) => (
          <div className="stat" key={l.id}>
            <div className="top"><span>{l.id}. {l.title}</span><span className="small muted">{state.lessons[l.id]?.done ? '✓ Read' : state.lessons[l.id] ? 'Started' : 'Not started'}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}
