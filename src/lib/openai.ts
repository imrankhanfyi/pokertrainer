/**
 * "Explain more" – calls the OpenAI Responses API straight from the browser.
 * Verified 2026-10-31: api.openai.com answers CORS preflights for any origin, so
 * no backend is needed. The key comes from this device's localStorage only.
 */
export const OPENAI_URL = 'https://api.openai.com/v1/responses';
export const MAX_OUTPUT_TOKENS = 350;
export const TIMEOUT_MS = 25000;
export const MAX_FOLLOW_UPS = 2;

export const SYSTEM_PROMPT = `You are a friendly poker coach inside a beginner training app for No-Limit Texas Hold'em.
The student is new: use plain English, short sentences, and define any poker term you use.
You will receive a practice scenario, the student's answer, the APP'S RECOMMENDED ANSWER and the app's short explanation.

Rules:
- Your job is to explain WHY the app's recommended answer makes sense. Do not overrule it.
- Base the explanation on beginner-friendly fundamentals (position, hand strength, simple maths), not solver jargon.
- If the decision is close or depends on the opponents, say so briefly.
- If you genuinely believe the app's answer is wrong, still explain the app's reasoning, then add one final line starting with "Note:" saying plainly what you disagree with and why. This helps the student spot errors in the app. Do not add a Note otherwise.
- If the student tells you what they were thinking, respond to THEIR reasoning first: say briefly what is right about it (if anything), then point to the exact step where it goes wrong, using this hand's facts. Do not just repeat the general explanation.
- Keep it short: at most about 120 words. No headings. Use at most 3 bullet points.
- For follow-up questions, answer only about this scenario and stay brief.`;

export interface ChatMsg { role: 'user' | 'assistant'; content: string }

export function scenarioMessage(facts: Record<string, string>, extra: { yourAnswer: string; recommended: string; explanation: string; closeNote?: string; reasoning?: string }): string {
  const lines = Object.entries(facts).filter(([, v]) => v).map(([k, v]) => `- ${k.replace(/_/g, ' ')}: ${v}`);
  const strip = (s: string) => s.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2').replace(/\[\[([^\]]+)\]\]/g, '$1').replace(/\*\*/g, '');
  return [
    'Scenario:',
    ...lines,
    `- my answer: ${extra.yourAnswer}`,
    `- app's recommended answer: ${extra.recommended}`,
    `- app's explanation: ${strip(extra.explanation)}`,
    extra.closeNote ? `- app's note: ${strip(extra.closeNote)}` : '',
    '',
    extra.reasoning?.trim()
      ? `I chose "${extra.yourAnswer}" because: "${extra.reasoning.trim()}". Why isn't that right here?`
      : 'Please explain the recommended answer in a bit more depth for a beginner.',
  ].filter((l) => l !== '').join('\n');
}

export function buildRequest(model: string, messages: ChatMsg[], withReasoning = true): Record<string, unknown> {
  return {
    model,
    instructions: SYSTEM_PROMPT,
    input: messages.map((m) => ({ role: m.role, content: m.content })),
    max_output_tokens: MAX_OUTPUT_TOKENS,
    store: false,
    // gpt-6-luna is a reasoning model; "none" stops hidden reasoning from eating the token cap.
    ...(withReasoning ? { reasoning: { effort: 'none' } } : {}),
  };
}

export type ErrorKind = 'no-key' | 'offline' | 'timeout' | 'auth' | 'quota' | 'rate' | 'model' | 'server' | 'bad-request' | 'rejected' | 'empty' | 'unknown';

export class ExplainError extends Error {
  constructor(public kind: ErrorKind, message: string) { super(message); }
}

export type Provider = 'openai' | 'gemini';
export const PROVIDER_NAME: Record<Provider, string> = { openai: 'OpenAI', gemini: 'Google Gemini' };

export function errorText(kind: ErrorKind, provider: Provider = 'openai'): string {
  const P = provider === 'gemini' ? 'Google' : 'OpenAI';
  const t: Record<ErrorKind, string> = {
    'no-key': `Add your ${PROVIDER_NAME[provider]} API key in Settings to use Explain more.`,
    offline: 'You’re offline. Explain more needs a connection – everything else works offline.',
    timeout: `${P} took too long to answer. Try again in a moment.`,
    auth: `${P} rejected the API key. Check it in Settings (it may have been deleted or mistyped).`,
    quota: 'Your OpenAI account is out of credit or hit its spending limit. Check your billing page.',
    rate: provider === 'gemini'
      ? 'Google’s free limit was reached (too many requests per minute, or for today). Wait a minute, or try again tomorrow.'
      : 'Too many requests right now. Wait a few seconds and try again.',
    model: 'That model name isn’t available to your key. Change it in Settings.',
    server: `${P} had a problem. Try again shortly.`,
    'bad-request': `${P} couldn’t process the request.`,
    rejected: 'OpenAI turned the request down and the browser couldn’t read why. Your key works, so check the model name in Settings (tap Check) and your spending limit.',
    empty: 'The answer came back empty. Try again, or try a different model in Settings.',
    unknown: `Something went wrong talking to ${P}.`,
  };
  return t[kind];
}

/** OpenAI wording, kept for existing callers. */
export const ERROR_TEXT = Object.fromEntries(
  (['no-key', 'offline', 'timeout', 'auth', 'quota', 'rate', 'model', 'server', 'bad-request', 'rejected', 'empty', 'unknown'] as ErrorKind[]).map((k) => [k, errorText(k, 'openai')]),
) as Record<ErrorKind, string>;

interface ApiErrorBody { error?: { message?: string; code?: string; type?: string; param?: string } }

export function classifyHttpError(status: number, body: ApiErrorBody): ExplainError {
  const e = body?.error ?? {};
  const msg = e.message ?? `HTTP ${status}`;
  if (status === 401) return new ExplainError('auth', msg);
  if (status === 429) return new ExplainError(e.code === 'insufficient_quota' || e.type === 'insufficient_quota' ? 'quota' : 'rate', msg);
  if (status === 404 || e.code === 'model_not_found' || (e.param === 'model')) return new ExplainError('model', msg);
  if (status >= 500) return new ExplainError('server', msg);
  if (status === 400) return new ExplainError('bad-request', msg);
  return new ExplainError('unknown', msg);
}

/** Pull the assistant text out of a Responses API result. */
export function parseResponse(json: unknown): { text: string; truncated: boolean } {
  const r = json as { status?: string; output_text?: string; output?: { type: string; content?: { type: string; text?: string }[] }[]; incomplete_details?: { reason?: string } };
  let text = typeof r.output_text === 'string' ? r.output_text : '';
  if (!text && Array.isArray(r.output)) {
    text = r.output
      .filter((o) => o.type === 'message')
      .flatMap((o) => o.content ?? [])
      .filter((c) => c.type === 'output_text' && typeof c.text === 'string')
      .map((c) => c.text)
      .join('\n');
  }
  text = text.trim();
  const truncated = r.status === 'incomplete';
  if (!text) throw new ExplainError('empty', `Empty response${r.incomplete_details?.reason ? ` (${r.incomplete_details.reason})` : ''}`);
  return { text, truncated };
}

export async function askOpenAI(opts: { apiKey: string | null; model: string; messages: ChatMsg[]; fetchImpl?: typeof fetch; timeoutMs?: number; online?: boolean }): Promise<{ text: string; truncated: boolean }> {
  const { apiKey, model, messages } = opts;
  if (!apiKey) throw new ExplainError('no-key', 'No API key');
  const online = opts.online ?? (typeof navigator === 'undefined' ? true : navigator.onLine);
  if (!online) throw new ExplainError('offline', 'Offline');
  const f = opts.fetchImpl ?? fetch;

  const attempt = async (withReasoning: boolean) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? TIMEOUT_MS);
    try {
      const res = await f(OPENAI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(buildRequest(model, messages, withReasoning)),
        signal: ctrl.signal,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw classifyHttpError(res.status, body);
      return parseResponse(body);
    } catch (e) {
      if (e instanceof ExplainError) throw e;
      if ((e as Error)?.name === 'AbortError') throw new ExplainError('timeout', 'Timed out');
      if (opts.online === false || (opts.online === undefined && typeof navigator !== 'undefined' && navigator.onLine === false)) throw new ExplainError('offline', 'Offline');
      // OpenAI's POST error responses don't always carry CORS headers, so the browser
      // reports a bare network error. GET /v1/models does return readable errors, so
      // use it to find out what actually went wrong.
      throw await diagnose(apiKey, f);
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    return await attempt(true);
  } catch (e) {
    // Some models don't accept reasoning settings – retry once without them.
    // In a browser that 400 is often unreadable (no CORS headers on error replies), so it
    // shows up as 'rejected' – retry once without reasoning in that case too.
    if (e instanceof ExplainError && ((e.kind === 'bad-request' && /reasoning/i.test(e.message)) || e.kind === 'rejected')) return attempt(false);
    throw e;
  }
}

/** Work out why an unreadable request failed by trying a cheap, CORS-friendly GET with the same key. */
export async function diagnose(apiKey: string, f: typeof fetch): Promise<ExplainError> {
  try {
    const res = await f('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${apiKey}` } });
    if (res.ok) return new ExplainError('rejected', 'Key valid; request rejected');
    const body = await res.json().catch(() => ({}));
    return classifyHttpError(res.status, body);
  } catch {
    return new ExplainError('unknown', 'Network error');
  }
}

/** List model ids available to the key (used by Settings to sanity-check the model name). */
export async function listModels(apiKey: string, fetchImpl: typeof fetch = fetch): Promise<string[]> {
  const res = await fetchImpl('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${apiKey}` } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw classifyHttpError(res.status, body);
  return ((body as { data?: { id: string }[] }).data ?? []).map((m) => m.id).sort();
}
