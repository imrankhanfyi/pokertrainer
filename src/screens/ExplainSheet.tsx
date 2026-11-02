import { useEffect, useRef, useState } from 'react';
import type { Question } from '../engine/scenarios/types';
import { askAI } from '../lib/ai';
import { type ChatMsg, type Provider, ExplainError, MAX_FOLLOW_UPS, errorText, scenarioMessage } from '../lib/openai';
import { Sheet } from '../ui/components';

// Keep answers per question for this app session so re-opening doesn't cost another call.
const cache = new Map<string, ChatMsg[]>();

function Answer({ text }: { text: string }) {
  // Highlight a trailing "Note:" (the model disagreeing with the app) so it's easy to spot.
  const idx = text.search(/(^|\n)\s*Note:/);
  if (idx < 0) return <div className="chat-msg assistant">{text}</div>;
  return (
    <>
      <div className="chat-msg assistant">{text.slice(0, idx).trim()}</div>
      <div className="chat-msg assistant chat-note"><strong>The AI disagrees with the app: </strong>{text.slice(idx).replace(/^\s*Note:\s*/, '').trim()}</div>
    </>
  );
}

export function ExplainSheet({ q, yourAnswer, recommended, provider, model, reasoning, onClose }: { q: Question; yourAnswer: string; recommended: string; provider: Provider; model: string; reasoning?: string; onClose: () => void }) {
  const why = !!reasoning?.trim();
  // Separate cache slots so "Explain more" and "Why was I wrong?" on the same hand don't overwrite each other.
  const cacheKey = `${q.id}:${why ? `why:${reasoning!.trim()}` : 'explain'}:${provider}`;
  const first: ChatMsg = { role: 'user', content: scenarioMessage({ ...q.facts, skill: q.skill }, { yourAnswer, recommended, explanation: q.explanation, closeNote: q.closeNote, reasoning }) };
  const [msgs, setMsgs] = useState<ChatMsg[]>(() => cache.get(cacheKey) ?? [first]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [truncated, setTruncated] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const followUps = msgs.filter((m) => m.role === 'user').length - 1;

  const send = async (history: ChatMsg[]) => {
    setLoading(true);
    setErr(null);
    try {
      const r = await askAI(provider, model, history);
      const next = [...history, { role: 'assistant' as const, content: r.text }];
      setTruncated(r.truncated);
      setMsgs(next);
      cache.set(cacheKey, next);
    } catch (e) {
      const kind = e instanceof ExplainError ? e.kind : 'unknown';
      setErr(errorText(kind, provider));
      setErrKind(kind);
      setMsgs(history);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (msgs.length === 1) void send(msgs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [msgs, loading]);

  const ask = () => {
    const text = draft.trim();
    if (!text || loading) return;
    setDraft('');
    void send([...msgs, { role: 'user', content: text }]);
  };

  // In "why" mode, show the student's own reasoning as the first bubble.
  const shown = why ? [{ role: 'user' as const, content: `You chose ${yourAnswer}: “${reasoning!.trim()}”` }, ...msgs.slice(1)] : msgs.slice(1);
  const [errKind, setErrKind] = useState<string | null>(null);
  // Retrying can't help with a bad key or model name – those need Settings.
  const lastFailed = !loading && err && msgs[msgs.length - 1].role === 'user' && !['auth', 'model', 'no-key'].includes(errKind ?? '');

  return (
    <Sheet title={why ? 'Why wasn’t that right?' : 'Explain more'} onClose={onClose}>
      {shown.map((m, i) => (m.role === 'assistant' ? <Answer key={i} text={m.content} /> : <div key={i} className="chat-msg user">{m.content}</div>))}
      {loading && <div className="chat-msg assistant muted">Thinking…</div>}
      {truncated && !loading && <div className="tiny">Answer was cut short to keep costs low.</div>}
      {err && (
        <div className="err" role="alert">
          {err}
          {lastFailed && <div style={{ marginTop: 8 }}><button className="btn small" onClick={() => send(msgs)}>Try again</button></div>}
        </div>
      )}
      {!loading && msgs[msgs.length - 1].role === 'assistant' && (
        followUps < MAX_FOLLOW_UPS ? (
          <form className="row" style={{ marginTop: 8 }} onSubmit={(e) => { e.preventDefault(); ask(); }}>
            <input className="input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Ask a follow-up (${MAX_FOLLOW_UPS - followUps} left)`} enterKeyHint="send" maxLength={300} aria-label="Follow-up question" />
            <button className="btn primary small" style={{ flex: 'none' }} disabled={!draft.trim()}>Ask</button>
          </form>
        ) : <div className="tiny" style={{ marginTop: 8 }}>That’s the follow-up limit for this hand – keeps things quick and cheap.</div>
      )}
      <div className="tiny" style={{ marginTop: 10 }}>AI explanations can be wrong. The app’s answer comes from its built-in charts.</div>
      <div ref={endRef} />
    </Sheet>
  );
}
