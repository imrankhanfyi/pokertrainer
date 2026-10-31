import { useEffect, useRef, useState } from 'react';
import type { Question } from '../engine/scenarios/types';
import { type ChatMsg, ERROR_TEXT, ExplainError, MAX_FOLLOW_UPS, askOpenAI, scenarioMessage } from '../lib/openai';
import { getApiKey } from '../lib/storage';
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

export function ExplainSheet({ q, yourAnswer, recommended, model, onClose }: { q: Question; yourAnswer: string; recommended: string; model: string; onClose: () => void }) {
  const first: ChatMsg = { role: 'user', content: scenarioMessage({ ...q.facts, skill: q.skill }, { yourAnswer, recommended, explanation: q.explanation, closeNote: q.closeNote }) };
  const [msgs, setMsgs] = useState<ChatMsg[]>(() => cache.get(q.id) ?? [first]);
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
      const r = await askOpenAI({ apiKey: getApiKey(), model, messages: history });
      const next = [...history, { role: 'assistant' as const, content: r.text }];
      setTruncated(r.truncated);
      setMsgs(next);
      cache.set(q.id, next);
    } catch (e) {
      const kind = e instanceof ExplainError ? e.kind : 'unknown';
      setErr(ERROR_TEXT[kind]);
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

  const shown = msgs.slice(1);
  const lastFailed = !loading && err && msgs[msgs.length - 1].role === 'user';

  return (
    <Sheet title="Explain more" onClose={onClose}>
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
