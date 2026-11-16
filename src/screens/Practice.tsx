import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Format } from '../data/positions';
import { FORMATS, FORMAT_SHORT } from '../data/positions';
import { positionsQuestion } from '../engine/scenarios/positions';
import { preflopQuestion } from '../engine/scenarios/preflop';
import { outsQuestion } from '../engine/scenarios/outs';
import { potOddsQuestion } from '../engine/scenarios/potodds';
import { postflopQuestion } from '../engine/scenarios/postflop';
import { fullHandQuestion } from '../engine/scenarios/fullhand';
import { type Question, type SkillId, SKILLS, gradeAnswer } from '../engine/scenarios/types';
import { getApiKey, mixWeights, recordAnswer } from '../lib/storage';
import { Cards, Icon, PlayingCard, Rich, TopBar } from '../ui/components';
import { PokerTable } from '../ui/PokerTable';
import { OrderOval } from '../ui/OrderOval';
import { Working } from '../ui/Working';
import { ChartAfterMiss } from '../ui/ChartAfterMiss';
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
  const [typed, setTyped] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [explaining, setExplaining] = useState(false);
  const [thought, setThought] = useState('');
  const [askedWhy, setAskedWhy] = useState<string | undefined>(undefined);
  const fbRef = useRef<HTMLDivElement>(null);
  const provider = state.settings.provider;
  const hasKey = !!getApiKey(provider);
  const aiModel = provider === 'gemini' ? state.settings.geminiModel : state.settings.model;

  const title = skill === 'mix' ? 'Mix it up' : SKILLS.find((s) => s.id === skill)!.title;

  const choose = (id: string) => {
    if (answer) return;
    setAnswer(id);
    const g = gradeAnswer(q, id);
    setSession((s) => ({ n: s.n + 1, right: s.right + (g === 'mistake' ? 0 : 1) }));
    update((s) => recordAnswer(s, q.skill, g));
  };

  const submitTyped = () => {
    if (answer || !typed.trim()) return;
    inputRef.current?.blur(); // closes the iPhone keyboard
    choose(typed.trim());
  };

  useEffect(() => {
    if (answer) fbRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [answer]);

  const goNext = () => {
    setAnswer(null);
    setExplaining(false);
    setThought('');
    setTyped('');
    setAskedWhy(undefined);
    setQ(q.followUp ?? next(format));
    window.scrollTo({ top: 0 });
  };

  const switchFormat = () => {
    const f: Format = FORMATS[(FORMATS.indexOf(format) + 1) % FORMATS.length];
    setFormat(f);
    setAnswer(null);
    setTyped('');
    setQ(next(f));
  };

  const correctChoice = q.choices.find((c) => c.id === q.correct);
  const yours = q.choices.find((c) => c.id === answer);
  const grade = answer ? gradeAnswer(q, answer) : null;
  const ok = grade === 'right';
  const three = q.choices.length === 3 && q.choices.every((c) => c.label.length <= 9);
  const recText = useMemo(() => (q.numeric ? q.numeric.answerText : correctChoice ? `${correctChoice.label}${correctChoice.sub ? ` ${correctChoice.sub}` : ''}` : ''), [q.numeric, correctChoice]);
  const yourText = q.numeric ? `${answer ?? ''}${q.numeric.unit === '%' ? '%' : ''}` : yours ? `${yours.label}${yours.sub ? ` ${yours.sub}` : ''}` : answer ?? '';

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
          {q.order && <OrderOval order={q.order} />}
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
            <div ref={fbRef} className={`feedback ${grade === 'right' ? 'good' : grade === 'close' ? 'close' : 'bad'}`} role="status">
              <div className="verdict">
                {grade === 'mistake' ? Icon.x : Icon.check}
                {grade === 'right' ? (q.close ? 'Right – and it’s a close one' : 'Right') : grade === 'close' ? 'Close call – also reasonable' : 'Not quite'}
              </div>
              {grade === 'close' && <div className="rec">{q.chart ? 'The chart prefers' : 'The coach prefers'}: {recText}<span className="muted"> · you chose {yourText}</span></div>}
              {grade === 'mistake' && <div className="rec">Recommended: {recText}{q.numeric ? <span className="muted"> · you said {yourText}</span> : yours ? <span className="muted"> · you chose {yours.label}</span> : null}</div>}
              {q.working && <Working steps={q.working} />}
              {q.explanation.split('\n\n').map((para, i) => <p key={i} style={{ marginBottom: i === q.explanation.split('\n\n').length - 1 ? 0 : 10 }}><Rich text={para} /></p>)}
              {!ok && q.chart && <ChartAfterMiss chart={q.chart} />}
              {q.closeNote && <div className="note"><b>{q.close ? (grade === 'mistake' ? 'Borderline hand · ' : 'Close call · ') : 'Note · '}</b><Rich text={q.closeNote} /></div>}
              <div style={{ marginTop: 12 }}>
                {hasKey ? (
                  <>
                    {!ok && (
                      <form className="why-form" onSubmit={(e) => { e.preventDefault(); if (thought.trim()) { setAskedWhy(thought.trim()); setExplaining(true); } }}>
                        <label className="tiny" htmlFor="why">What were you thinking? Tell the coach and it’ll explain where it goes wrong.</label>
                        <textarea id="why" className="input" rows={2} maxLength={300} value={thought} onChange={(e) => setThought(e.target.value)} placeholder="e.g. I thought the button acts first because it’s the dealer" />
                        <button className="btn small primary" disabled={!thought.trim()}>{Icon.spark} Why isn’t that right?</button>
                      </form>
                    )}
                    <button className="btn small ghost" onClick={() => { setAskedWhy(undefined); setExplaining(true); }} style={{ paddingLeft: 0 }}>{Icon.spark} Explain more</button>
                  </>
                ) : (
                  <div className="tiny">Want a deeper explanation, or to ask why your answer was wrong? Add a free Google Gemini key (or an OpenAI key) in Settings.</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className={`choices${three && !answer ? ' cols-3' : ''}${answer ? ' settled' : ''}`}>
          {!answer ? (
            q.numeric ? (
              <form className="num-form" onSubmit={(e) => { e.preventDefault(); submitTyped(); }}>
                <label className="num-field">
                  <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Your answer in {q.numeric.unit}</span>
                  <input
                    ref={inputRef}
                    value={typed}
                    onChange={(e) => setTyped(e.target.value.replace(q.numeric!.decimal ? /[^0-9.,]/g : /[^0-9]/g, ''))}
                    onFocus={() => window.setTimeout(() => inputRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 250)}
                    inputMode={q.numeric.decimal ? 'decimal' : 'numeric'}
                    pattern={q.numeric.decimal ? '[0-9]*[.,]?[0-9]*' : '[0-9]*'}
                    placeholder={q.numeric.placeholder ?? '0'}
                    enterKeyHint="done"
                    autoComplete="off"
                    maxLength={6}
                  />
                  <span className="unit">{q.numeric.unit}</span>
                </label>
                <button type="submit" className="btn primary" disabled={!typed.trim()}>Check</button>
              </form>
            ) : q.choices.map((c) => (
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
          yourAnswer={yourText}
          grade={grade ?? undefined}
          recommended={recText}
          provider={provider}
          model={aiModel}
          reasoning={askedWhy}
          onClose={() => setExplaining(false)}
        />
      )}
    </div>
  );
}
