import { beforeEach, describe, expect, it } from 'vitest';
import { askGemini, buildGeminiRequest, classifyGeminiError, listGeminiModels, parseGeminiResponse } from '../src/lib/gemini';
import { SYSTEM_PROMPT, errorText, scenarioMessage } from '../src/lib/openai';
import { API_KEY_KEY, GEMINI_KEY_KEY, defaultState, exportBackup, getApiKey, loadState, recordAnswer, removeApiKey, saveState, setApiKey } from '../src/lib/storage';

class MemStorage {
  m = new Map<string, string>();
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
}
beforeEach(() => { (globalThis as unknown as { localStorage: MemStorage }).localStorage = new MemStorage(); });

// Raw body captured from generativelanguage.googleapis.com with a fake key on 2026-11-02.
const BAD_KEY_BODY = { error: { code: 400, message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT', details: [{ '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason: 'API_KEY_INVALID', domain: 'googleapis.com' }] } };
const okBody = { candidates: [{ content: { role: 'model', parts: [{ text: 'Because ' }, { text: 'position.' }] }, finishReason: 'STOP' }] };
const fakeFetch = (status: number, body: unknown, seen?: { url: string; init?: RequestInit }[]) =>
  (async (url: string, init?: RequestInit) => {
    seen?.push({ url, init });
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  }) as unknown as typeof fetch;

describe('provider settings and keys', () => {
  it('provider and Gemini model survive save → load (no silent reset)', () => {
    const s = defaultState();
    s.settings.provider = 'gemini';
    s.settings.geminiModel = 'gemini-2.5-flash-lite';
    saveState(recordAnswer(s, 'positions', true));
    const back = loadState();
    expect(back.settings.provider).toBe('gemini');
    expect(back.settings.geminiModel).toBe('gemini-2.5-flash-lite');
    expect(back.stats.positions?.seen).toBe(1);
  });
  it('old saved state without a provider defaults to OpenAI and keeps its model', () => {
    localStorage.setItem('holdem-coach:state:v1', JSON.stringify({ version: 1, settings: { format: 'sixmax', model: 'gpt-x' }, stats: {}, lessons: {} }));
    const s = loadState();
    expect(s.settings.provider).toBe('openai');
    expect(s.settings.model).toBe('gpt-x');
    expect(s.settings.geminiModel).toBe('gemini-3.5-flash-lite');
  });
  it('each provider has its own key, and backups contain neither', () => {
    setApiKey('sk-OPENAISECRET123456', 'openai');
    setApiKey('AIzaGEMINISECRET123456', 'gemini');
    expect(getApiKey('openai')).toBe('sk-OPENAISECRET123456');
    expect(getApiKey('gemini')).toBe('AIzaGEMINISECRET123456');
    const json = exportBackup(loadState());
    for (const bad of ['OPENAISECRET', 'GEMINISECRET', API_KEY_KEY, GEMINI_KEY_KEY]) expect(json).not.toContain(bad);
    removeApiKey('gemini');
    expect(getApiKey('gemini')).toBeNull();
    expect(getApiKey('openai')).toBe('sk-OPENAISECRET123456');
  });
});

describe('Gemini client', () => {
  const msgs = [{ role: 'user' as const, content: 'hi' }, { role: 'assistant' as const, content: 'hello' }, { role: 'user' as const, content: 'why?' }];
  it('builds a generateContent body with the system prompt and user/model roles', () => {
    const b = buildGeminiRequest(msgs) as { systemInstruction: { parts: { text: string }[] }; contents: { role: string; parts: { text: string }[] }[]; generationConfig: { maxOutputTokens: number } };
    expect(b.systemInstruction.parts[0].text).toBe(SYSTEM_PROMPT);
    expect(b.contents.map((c) => c.role)).toEqual(['user', 'model', 'user']);
    expect(b.contents[2].parts[0].text).toBe('why?');
    expect(b.generationConfig.maxOutputTokens).toBeGreaterThan(350);
    expect(Object.keys(b.generationConfig)).toEqual(['maxOutputTokens']);
  });
  it('sends the key only to Google, in a header (not the URL)', async () => {
    const seen: { url: string; init?: RequestInit }[] = [];
    const r = await askGemini({ apiKey: 'AIzaKEY', model: 'gemini-3.5-flash-lite', messages: msgs, fetchImpl: fakeFetch(200, okBody, seen), online: true });
    expect(r).toEqual({ text: 'Because position.', truncated: false });
    expect(seen).toHaveLength(1);
    expect(seen[0].url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');
    expect(seen[0].url).not.toContain('AIzaKEY');
    expect((seen[0].init!.headers as Record<string, string>)['x-goog-api-key']).toBe('AIzaKEY');
  });
  it('maps the real bad-key reply to "key rejected", never contacting OpenAI', async () => {
    const seen: { url: string }[] = [];
    await expect(askGemini({ apiKey: 'AIzaFAKE', model: 'm', messages: msgs, fetchImpl: fakeFetch(400, BAD_KEY_BODY, seen), online: true })).rejects.toMatchObject({ kind: 'auth' });
    expect(seen.every((x) => x.url.startsWith('https://generativelanguage.googleapis.com/'))).toBe(true);
  });
  it('maps other errors', () => {
    expect(classifyGeminiError(429, { error: { status: 'RESOURCE_EXHAUSTED' } }).kind).toBe('rate');
    expect(classifyGeminiError(404, { error: { status: 'NOT_FOUND' } }).kind).toBe('model');
    expect(classifyGeminiError(403, { error: { status: 'PERMISSION_DENIED' } }).kind).toBe('auth');
    expect(classifyGeminiError(503, {}).kind).toBe('server');
    expect(classifyGeminiError(400, { error: { status: 'INVALID_ARGUMENT', message: 'bad field' } }).kind).toBe('bad-request');
    expect(errorText('rate', 'gemini')).toMatch(/free limit/);
    expect(errorText('auth', 'gemini')).toMatch(/^Google rejected/);
  });
  it('parses truncation, skips thought parts, and treats blocks as errors', () => {
    expect(parseGeminiResponse({ candidates: [{ content: { parts: [{ text: 'thinking…', thought: true }, { text: 'Answer' }] }, finishReason: 'MAX_TOKENS' }] })).toEqual({ text: 'Answer', truncated: true });
    expect(() => parseGeminiResponse({ promptFeedback: { blockReason: 'SAFETY' } })).toThrow(/Blocked/);
    expect(() => parseGeminiResponse({ candidates: [{ finishReason: 'SAFETY' }] })).toThrow(/Blocked/);
    expect(() => parseGeminiResponse({ candidates: [{ content: { parts: [] }, finishReason: 'STOP' }] })).toThrow(/Empty/);
  });
  it('offline and missing key fail fast without a request', async () => {
    const seen: { url: string }[] = [];
    await expect(askGemini({ apiKey: null, model: 'm', messages: msgs, fetchImpl: fakeFetch(200, okBody, seen) })).rejects.toMatchObject({ kind: 'no-key' });
    await expect(askGemini({ apiKey: 'k', model: 'm', messages: msgs, fetchImpl: fakeFetch(200, okBody, seen), online: false })).rejects.toMatchObject({ kind: 'offline' });
    expect(seen).toHaveLength(0);
  });
  it('lists models without the "models/" prefix', async () => {
    const ids = await listGeminiModels('k', fakeFetch(200, { models: [{ name: 'models/gemini-3.5-flash-lite' }, { name: 'models/gemini-2.5-flash-lite' }] }));
    expect(ids).toEqual(['gemini-2.5-flash-lite', 'gemini-3.5-flash-lite']);
  });
});

describe('"Why isn\'t that right?" prompt', () => {
  it('puts the student\'s reasoning in the first message, and the system prompt tells the model to address it', () => {
    const m = scenarioMessage({ question: 'Who acts first post-flop' }, { yourAnswer: 'Button (BTN)', recommended: 'Small blind (SB)', explanation: 'SB acts first.', reasoning: '  the dealer goes first  ' });
    expect(m).toContain('I chose "Button (BTN)" because: "the dealer goes first". Why isn\'t that right here?');
    expect(m).not.toContain('Please explain the recommended answer');
    expect(SYSTEM_PROMPT).toMatch(/respond to THEIR reasoning first/);
    const plain = scenarioMessage({ q: 'x' }, { yourAnswer: 'a', recommended: 'b', explanation: 'c' });
    expect(plain).toContain('Please explain the recommended answer');
  });
});

describe('positions facts sent to the AI', () => {
  it('describe the seat relative to the button correctly, including the blinds', async () => {
    const { positionsQuestion } = await import('../src/engine/scenarios/positions');
    const { seededRng } = await import('../src/engine/cards');
    const rng = seededRng(3);
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) {
      const q = positionsQuestion(i % 2 ? 'fullring' : 'sixmax', rng);
      const rel = q.facts.my_seat_relative_to_button;
      if (!rel) continue;
      seen.add(q.correct);
      if (q.correct === 'SB') expect(rel).toBe('1 seat to the left of the button');
      if (q.correct === 'BB') expect(rel).toBe('2 seats to the left of the button');
      if (q.correct === 'BTN') expect(rel).toBe('I am on the button');
      if (q.correct === 'CO') expect(rel).toBe('1 seat to the right of the button');
      expect(rel).not.toMatch(/^[5-9] seats/);
    }
    for (const p of ['SB', 'BB', 'BTN', 'CO']) expect(seen.has(p)).toBe(true);
  });
});
