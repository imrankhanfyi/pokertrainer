import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Format } from '../data/positions';
import { FORMAT_SHORT } from '../data/positions';
import { positionsQuestion } from '../engine/scenarios/positions';
import { preflopQuestion } from '../engine/scenarios/preflop';
import { outsQuestion } from '../engine/scenarios/outs';
import { potOddsQuestion } from '../engine/scenarios/potodds';
import { postflopQuestion } from '../engine/scenarios/postflop';
import { fullHandQuestion } from '../engine/scenarios/fullhand';
import { type Question, type SkillId, SKILLS } from '../engine/scenarios/types';
import { getApiKey, mixWeights, recordAnswer } from '../lib/storage';
import { Cards, Icon, PlayingCard, Rich, TopBar } from '../ui/components';
import { PokerTable } from '../ui/PokerTable';
import { back, useApp } from '../ui/state';
import { ExplainSheet } from './ExplainSheet';

const GEN: Record<SkillId, (f: Format) => Question> = {
  positions: (f) => positionsQuestion(f),
  preflop: (f) => preflopQuestion(f),
  outs: (f) => outsQuestion(f),
  potodds: (f) => potOddsQuestion(f),
  postflop: (f) => postflopQuestion(f),
  fullhand: (f) => fullHandQuestion(f),
};

function pickSkill(weights: Record<SkillId, number>): SkillId {
  const entries = Object.entries(weights) as [SkillId, number][];
  let r = Math.random() * entries.reduce((s, [, w]) => s + w, 0);
  for (const [k, w] of entries) if ((r -= w) < 0) return k;
  return entries[0][0];
}

export function Practice({ skill }: { skill: SkillId | 'mix' }) {
  const { state, update } = useApp();
  const [format, setFormat] = useState<Format>(state.settings.format);
  const stateRef = useRef(state);
  stateRef.current = state;

  const next = useCallback((f: Format): Question => {
    const s: SkillId = skill === 'mix' ? pickSkill(mixWeights(stateRef.current, SKILLS.map((k) => k.id))) : skill;
    return GEN[s](f);
  }, [skill]);

  const [q, setQ] = useState<Question>(() => next(format));
  const [answer, setAnswer] = useState<string | null>(null);
  const [session, setSession] = useState({ n: 0, right: 0 });
  const [explaining, setExplaining] = useState(false);
  const fbRef = useRef<HTMLDivElement>(null);
  const hasKey = !!getApiKey();

  const title = skill === 'mix' ? 'Mix it up' : SKILLS.find((s) => s.id === skill)!.title;

  const choose = (id: string) => {
    if (answer) return;
    setAnswer(id);
    const ok = id === q.correct;
    setSession((s) => ({ n: s.n + 1, right: s.right + (ok ? 1 : 0) }));
    update((s) => recordAnswer(s, q.skill, ok));
  };

  useEffect(() => {
    if (answer) fbRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [answer]);

  const goNext = () => {
    setAnswer(null);
    setExplaining(false);
    setQ(q.followUp ?? next(format));
    window.scrollTo({ top: 0 });
  };

  const switchFormat = () => {
    const f: Format = format === 'fullring' ? 'sixmax' : 'fullring';
    setFormat(f);
    setAnswer(null);
    setQ(next(f));
  };

  const correctChoice = q.choices.find((c) => c.id === q.correct)!;
  const yours = q.choices.find((c) => c.id === answer);
  const ok = answer === q.correct;
  const three = q.choices.length === 3 && q.choices.every((c) => c.label.length <= 9);
  const recText = useMemo(() => `${correctChoice.label}${correctChoice.sub ? ` ${correctChoice.sub}` : ''}`, [correctChoice]);

  return (
    <div className="screen no-tabs">
      <div className="drill">
        <TopBar
          title={title}
          onBack={back}
          right={
            <button className="chip" onClick={switchFormat} aria-label={`Format: ${FORMAT_SHORT[format]}. Tap to switch.`} style={{ marginRight: 4 }}>
              {FORMAT_SHORT[format]}
            </button>
          }
        />
        <div className="drill-main">
          {(skill === 'mix' || q.stepLabel) && (
            <div className="tiny">{[skill === 'mix' ? SKILLS.find((s) => s.id === q.skill)!.title : null, q.stepLabel].filter(Boolean).join(' · ')}</div>
          )}
          <div className="prompt"><Rich text={q.prompt} /></div>
          {q.context && <div className="context">{q.context}</div>}
          {q.table && <PokerTable t={q.table} />}
          {q.cardsView && (
            <div className="cards-view">
              {q.cardsView.villain && (
                <div className="cv-row"><span className="cv-label">{q.cardsView.villainLabel ?? 'Opponent'}</span><Cards cards={q.cardsView.villain} size="md" /></div>
              )}
              <div className="cv-row"><span className="cv-label">Board</span>{q.cardsView.board.length ? <Cards cards={q.cardsView.board} size="md" /> : <span className="muted small">No cards yet – before the flop</span>}</div>
              <div className="cv-row"><span className="cv-label">You</span><Cards cards={q.cardsView.hero} size="lg" /></div>
            </div>
          )}
          {q.table?.heroCards && (
            <div className="hero-hand" aria-label="Your cards">
              <PlayingCard card={q.table.heroCards[0]} size="lg" />
              <PlayingCard card={q.table.heroCards[1]} size="lg" />
            </div>
          )}

          {answer && (
            <div ref={fbRef} className={`feedback ${ok ? 'good' : 'bad'}`} role="status">
              <div className="verdict">
                {ok ? Icon.check : Icon.x}
                {ok ? (q.close ? 'Right – and it’s a close one' : 'Right') : 'Not quite'}
              </div>
              {!ok && <div className="rec">Recommended: {recText}{yours ? <span className="muted"> · you chose {yours.label}</span> : null}</div>}
              {q.explanation.split('\n\n').map((para, i) => <p key={i} style={{ marginBottom: i === q.explanation.split('\n\n').length - 1 ? 0 : 10 }}><Rich text={para} /></p>)}
              {q.closeNote && <div className="note"><b>{q.close ? 'Close call · ' : 'Note · '}</b><Rich text={q.closeNote} /></div>}
              <div style={{ marginTop: 12 }}>
                {hasKey ? (
                  <button className="btn small ghost" onClick={() => setExplaining(true)} style={{ paddingLeft: 0 }}>{Icon.spark} Explain more</button>
                ) : (
                  <div className="tiny">Want a deeper explanation? Add an OpenAI key in Settings to enable “Explain more”.</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className={`choices${three && !answer ? ' cols-3' : ''}${answer ? ' settled' : ''}`}>
          {!answer ? (
            q.choices.map((c) => (
              <button key={c.id} className="choice" onClick={() => choose(c.id)}>
                <span>{c.label}</span>
                {c.sub && <span className="sub">{c.sub}</span>}
              </button>
            ))
          ) : (
            <button className="btn primary" onClick={goNext} autoFocus>{q.followUp ? 'Continue' : 'Next'} {Icon.chev}</button>
          )}
          <div className="session" aria-live="polite">{session.n > 0 ? `${session.right} of ${session.n} this session · stop any time` : 'Answer as many as you like'}</div>
        </div>
      </div>
      {explaining && answer && (
        <ExplainSheet
          q={q}
          yourAnswer={yours ? `${yours.label}${yours.sub ? ` ${yours.sub}` : ''}` : answer}
          recommended={recText}
          model={state.settings.model}
          onClose={() => setExplaining(false)}
        />
      )}
    </div>
  );
}
