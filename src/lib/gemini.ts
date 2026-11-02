/**
 * "Explain more" via Google's Gemini API (generateContent), called straight from the browser.
 * Verified 2026-11-02: generativelanguage.googleapis.com answers CORS preflights for this site
 * with `x-goog-api-key` allowed, and its error replies carry CORS headers too, so errors are
 * readable directly (no OpenAI-style diagnose step – the key is only ever sent to Google).
 */
import { type ChatMsg, ExplainError, SYSTEM_PROMPT, TIMEOUT_MS } from './openai';

export const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
/** Thinking tokens count towards this cap on Gemini 3.x, so leave headroom; the prompt keeps answers short. */
export const GEMINI_MAX_OUTPUT_TOKENS = 1024;

export function buildGeminiRequest(messages: ChatMsg[]): Record<string, unknown> {
  return {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    // No thinkingConfig on purpose: Flash-Lite models default to minimal/no thinking.
    generationConfig: { maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS },
  };
}

interface GeminiErrorBody { error?: { code?: number; message?: string; status?: string; details?: { reason?: string }[] } }

export function classifyGeminiError(status: number, body: GeminiErrorBody): ExplainError {
  const e = body?.error ?? {};
  const msg = e.message ?? `HTTP ${status}`;
  const reasons = (e.details ?? []).map((d) => d?.reason ?? '');
  if (reasons.includes('API_KEY_INVALID') || status === 401 || status === 403 || e.status === 'PERMISSION_DENIED' || e.status === 'UNAUTHENTICATED') return new ExplainError('auth', msg);
  if (status === 429 || e.status === 'RESOURCE_EXHAUSTED') return new ExplainError('rate', msg);
  if (status === 404 || e.status === 'NOT_FOUND') return new ExplainError('model', msg);
  if (status >= 500) return new ExplainError('server', msg);
  if (status === 400) return new ExplainError('bad-request', msg);
  return new ExplainError('unknown', msg);
}

const BLOCKED = new Set(['SAFETY', 'RECITATION', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII', 'LANGUAGE']);

export function parseGeminiResponse(json: unknown): { text: string; truncated: boolean } {
  const r = json as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[]; promptFeedback?: { blockReason?: string } };
  if (r.promptFeedback?.blockReason) throw new ExplainError('bad-request', `Blocked: ${r.promptFeedback.blockReason}`);
  const c = r.candidates?.[0];
  const text = (c?.content?.parts ?? []).filter((p) => !p.thought && typeof p.text === 'string').map((p) => p.text).join('').trim();
  if (!text) {
    if (c?.finishReason && BLOCKED.has(c.finishReason)) throw new ExplainError('bad-request', `Blocked: ${c.finishReason}`);
    throw new ExplainError('empty', `Empty response${c?.finishReason ? ` (${c.finishReason})` : ''}`);
  }
  return { text, truncated: c?.finishReason === 'MAX_TOKENS' };
}

export async function askGemini(opts: { apiKey: string | null; model: string; messages: ChatMsg[]; fetchImpl?: typeof fetch; timeoutMs?: number; online?: boolean }): Promise<{ text: string; truncated: boolean }> {
  const { apiKey, model, messages } = opts;
  if (!apiKey) throw new ExplainError('no-key', 'No API key');
  const online = opts.online ?? (typeof navigator === 'undefined' ? true : navigator.onLine);
  if (!online) throw new ExplainError('offline', 'Offline');
  const f = opts.fetchImpl ?? fetch;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? TIMEOUT_MS);
  try {
    const res = await f(`${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(buildGeminiRequest(messages)),
      signal: ctrl.signal,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw classifyGeminiError(res.status, body);
    return parseGeminiResponse(body);
  } catch (e) {
    if (e instanceof ExplainError) throw e;
    if ((e as Error)?.name === 'AbortError') throw new ExplainError('timeout', 'Timed out');
    if (opts.online === false || (opts.online === undefined && typeof navigator !== 'undefined' && navigator.onLine === false)) throw new ExplainError('offline', 'Offline');
    throw new ExplainError('unknown', 'Network error');
  } finally {
    clearTimeout(timer);
  }
}

/** Model ids available to the key, without the "models/" prefix. */
export async function listGeminiModels(apiKey: string, fetchImpl: typeof fetch = fetch): Promise<string[]> {
  const res = await fetchImpl(`${GEMINI_BASE}/models?pageSize=1000`, { headers: { 'x-goog-api-key': apiKey } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw classifyGeminiError(res.status, body);
  return ((body as { models?: { name: string }[] }).models ?? []).map((m) => m.name.replace(/^models\//, '')).sort();
}
