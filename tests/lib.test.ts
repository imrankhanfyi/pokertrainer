import { beforeEach, describe, expect, it } from 'vitest';
import { API_KEY_KEY, defaultState, exportBackup, getApiKey, importBackup, loadState, maskKey, mixWeights, recordAnswer, removeApiKey, saveState, setApiKey } from '../src/lib/storage';
import { ExplainError, askOpenAI, buildRequest, classifyHttpError, parseResponse, scenarioMessage, SYSTEM_PROMPT } from '../src/lib/openai';

// Minimal localStorage stand-in for Node.
class MemStorage {
  m = new Map<string, string>();
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
}

beforeEach(() => { (globalThis as unknown as { localStorage: MemStorage }).localStorage = new MemStorage(); });

describe('storage & backup', () => {
  it('backup never contains the API key', () => {
    const KEY = 'sk-proj-SECRET1234567890abcd';
    setApiKey(KEY);
    let s = recordAnswer(defaultState(), 'preflop', true);
    saveState(s);
    s = loadState();
    const json = exportBackup(s);
    expect(json).not.toContain(KEY);
    expect(json).not.toContain('SECRET');
    expect(json).not.toContain(API_KEY_KEY);
    expect(getApiKey()).toBe(KEY);
  });
  it('round-trips a backup and rejects junk', () => {
    const s = recordAnswer(recordAnswer(defaultState(), 'positions', true), 'positions', false);
    const back = importBackup(exportBackup(s));
    expect(back.stats.positions).toEqual({ seen: 2, correct: 1, recent: [1, 0] });
    expect(() => importBackup('{"hello":1}')).toThrow();
    expect(() => importBackup('not json')).toThrow();
  });
  it('remove key works and the mask hides the middle', () => {
    setApiKey('sk-abcdefghijklmnop1234');
    expect(maskKey(getApiKey()!)).toBe('sk-••••••••1234');
    removeApiKey();
    expect(getApiKey()).toBeNull();
  });
  it('mix weights lean towards weaker skills', () => {
    let s = defaultState();
    for (let i = 0; i < 10; i++) s = recordAnswer(s, 'positions', true);
    for (let i = 0; i < 10; i++) s = recordAnswer(s, 'preflop', i % 2 === 0);
    const w = mixWeights(s, ['positions', 'preflop']);
    expect(w.preflop).toBeGreaterThan(w.positions);
    expect(w.positions).toBe(1);
  });
});

describe('Explain more (OpenAI) client', () => {
  const msgs = [{ role: 'user' as const, content: 'hi' }];
  const okBody = { status: 'completed', output: [{ type: 'reasoning' }, { type: 'message', content: [{ type: 'output_text', text: 'Because position.' }] }] };
  const fakeFetch = (status: number, body: unknown, seen?: { url?: string; init?: RequestInit }[]) =>
    (async (url: string, init: RequestInit) => {
      seen?.push({ url, init });
      return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
    }) as unknown as typeof fetch;

  it('builds a capped, non-stored request with the system prompt', () => {
    const b = buildRequest('gpt-6-luna', msgs) as Record<string, unknown>;
    expect(b.max_output_tokens).toBeLessThanOrEqual(400);
    expect(b.store).toBe(false);
    expect(b.instructions).toBe(SYSTEM_PROMPT);
    expect(SYSTEM_PROMPT).toMatch(/not overrule/i);
    expect(SYSTEM_PROMPT).toMatch(/Note:/);
  });
  it('scenario message includes recommended answer and strips glossary markup', () => {
    const m = scenarioMessage({ position: 'Button', hand: 'As Kd (AKo)' }, { yourAnswer: 'Fold', recommended: 'Raise', explanation: 'Raise to [[open-raise|open]] **now**.' });
    expect(m).toContain("app's recommended answer: Raise");
    expect(m).toContain('Raise to open now.');
    expect(m).not.toContain('[[');
  });
  it('parses message text and ignores reasoning items', () => {
    expect(parseResponse(okBody).text).toBe('Because position.');
    expect(() => parseResponse({ status: 'incomplete', output: [] })).toThrow(ExplainError);
  });
  it('sends the key only as a bearer header to api.openai.com', async () => {
    const seen: { url?: string; init?: RequestInit }[] = [];
    const r = await askOpenAI({ apiKey: 'sk-test', model: 'gpt-6-luna', messages: msgs, fetchImpl: fakeFetch(200, okBody, seen), online: true });
    expect(r.text).toBe('Because position.');
    expect(seen[0].url).toBe('https://api.openai.com/v1/responses');
    expect((seen[0].init!.headers as Record<string, string>).Authorization).toBe('Bearer sk-test');
    expect(String(seen[0].init!.body)).not.toContain('sk-test');
  });
  it('maps HTTP errors to friendly kinds', () => {
    expect(classifyHttpError(401, {}).kind).toBe('auth');
    expect(classifyHttpError(429, { error: { code: 'insufficient_quota' } }).kind).toBe('quota');
    expect(classifyHttpError(429, { error: { code: 'rate_limit_exceeded' } }).kind).toBe('rate');
    expect(classifyHttpError(404, { error: { code: 'model_not_found' } }).kind).toBe('model');
    expect(classifyHttpError(503, {}).kind).toBe('server');
  });
  it('no key / offline / timeout are handled without throwing raw errors', async () => {
    await expect(askOpenAI({ apiKey: null, model: 'm', messages: msgs })).rejects.toMatchObject({ kind: 'no-key' });
    await expect(askOpenAI({ apiKey: 'k', model: 'm', messages: msgs, online: false })).rejects.toMatchObject({ kind: 'offline' });
    const hang = ((_u: string, init: RequestInit) => new Promise((_, rej) => init.signal!.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' }))))) as unknown as typeof fetch;
    await expect(askOpenAI({ apiKey: 'k', model: 'm', messages: msgs, online: true, fetchImpl: hang, timeoutMs: 50 })).rejects.toMatchObject({ kind: 'timeout' });
  });
  it('diagnoses an unreadable (CORS-blocked) failure via GET /v1/models', async () => {
    const mk = (modelsStatus: number, body: unknown) => (async (url: string) => {
      if (url.endsWith('/v1/responses')) throw new TypeError('Load failed');
      return new Response(JSON.stringify(body), { status: modelsStatus });
    }) as unknown as typeof fetch;
    await expect(askOpenAI({ apiKey: 'k', model: 'm', messages: msgs, online: true, fetchImpl: mk(401, {}) })).rejects.toMatchObject({ kind: 'auth' });
    await expect(askOpenAI({ apiKey: 'k', model: 'm', messages: msgs, online: true, fetchImpl: mk(429, { error: { code: 'insufficient_quota' } }) })).rejects.toMatchObject({ kind: 'quota' });
    await expect(askOpenAI({ apiKey: 'k', model: 'm', messages: msgs, online: true, fetchImpl: mk(200, { data: [] }) })).rejects.toMatchObject({ kind: 'rejected' });
  });
  it('retries without reasoning when the failure is unreadable but the key is valid', async () => {
    const bodies: Record<string, unknown>[] = [];
    const f = (async (url: string, init: RequestInit) => {
      if (url.endsWith('/v1/models')) return new Response('{"data":[]}', { status: 200 });
      const body = JSON.parse(String(init.body));
      bodies.push(body);
      if (body.reasoning) throw new TypeError('Load failed');
      return new Response(JSON.stringify(okBody), { status: 200 });
    }) as unknown as typeof fetch;
    const r = await askOpenAI({ apiKey: 'k', model: 'm', messages: msgs, online: true, fetchImpl: f });
    expect(r.text).toBe('Because position.');
    expect(bodies.length).toBe(2);
    expect(bodies[1].reasoning).toBeUndefined();
  });
  it('retries without reasoning settings if the model rejects them', async () => {
    let n = 0;
    const f = (async (_u: string, init: RequestInit) => {
      n++;
      const body = JSON.parse(String(init.body));
      if (body.reasoning) return new Response(JSON.stringify({ error: { message: "Unsupported parameter: 'reasoning.effort'", param: 'reasoning.effort' } }), { status: 400 });
      return new Response(JSON.stringify(okBody), { status: 200 });
    }) as unknown as typeof fetch;
    const r = await askOpenAI({ apiKey: 'k', model: 'other-model', messages: msgs, fetchImpl: f, online: true });
    expect(r.text).toBe('Because position.');
    expect(n).toBe(2);
  });
});
