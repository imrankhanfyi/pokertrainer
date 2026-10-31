import type { Format } from '../data/positions';
import type { SkillId } from '../engine/scenarios/types';

export const STATE_KEY = 'holdem-coach:state:v1';
/** The API key lives under its own key and is never part of the state object or backups. */
export const API_KEY_KEY = 'holdem-coach:openai-key';

export const DEFAULT_MODEL = 'gpt-6-luna';

export interface SkillStats { seen: number; correct: number; recent: number[] /* 1 = right, last 20 */ }

export interface Settings {
  format: Format;
  fourColor: boolean;
  theme: 'system' | 'light' | 'dark';
  model: string;
}

export interface AppState {
  version: 1;
  settings: Settings;
  stats: Partial<Record<SkillId, SkillStats>>;
  lessons: Record<number, { screen: number; done: boolean }>;
}

export const defaultState = (): AppState => ({
  version: 1,
  settings: { format: 'fullring', fourColor: false, theme: 'system', model: DEFAULT_MODEL },
  stats: {},
  lessons: {},
});

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, v: string) {
  try { localStorage.setItem(key, v); } catch { /* storage full or blocked – nothing we can do */ }
}

export function loadState(): AppState {
  const raw = safeGet(STATE_KEY);
  if (!raw) return defaultState();
  try { return normalise(JSON.parse(raw)); } catch { return defaultState(); }
}

export function saveState(s: AppState) { safeSet(STATE_KEY, JSON.stringify(s)); }

/** Validate/repair anything loaded from storage or an imported backup. */
export function normalise(x: unknown): AppState {
  const d = defaultState();
  if (!x || typeof x !== 'object') throw new Error('Not a backup file');
  const o = x as Partial<AppState> & { app?: string; data?: unknown };
  const src = (o.app === 'holdem-coach' ? o.data : o) as Partial<AppState>;
  if (!src || typeof src !== 'object' || src.version !== 1) throw new Error('Unrecognised backup version');
  const st = src.settings ?? d.settings;
  return {
    version: 1,
    settings: {
      format: st.format === 'sixmax' ? 'sixmax' : 'fullring',
      fourColor: !!st.fourColor,
      theme: st.theme === 'light' || st.theme === 'dark' ? st.theme : 'system',
      model: typeof st.model === 'string' && st.model.trim() ? st.model.trim() : DEFAULT_MODEL,
    },
    stats: Object.fromEntries(
      Object.entries(src.stats ?? {}).map(([k, v]) => [k, {
        seen: Number(v?.seen) || 0,
        correct: Number(v?.correct) || 0,
        recent: Array.isArray(v?.recent) ? v!.recent.slice(-20).map((n) => (n ? 1 : 0)) : [],
      }]),
    ),
    lessons: typeof src.lessons === 'object' && src.lessons ? src.lessons : {},
  };
}

/** Backup JSON. Built from the state object only – the API key is stored elsewhere and never included. */
export function exportBackup(s: AppState): string {
  return JSON.stringify({ app: 'holdem-coach', exportedAt: new Date().toISOString(), data: s }, null, 2);
}

export function importBackup(json: string): AppState { return normalise(JSON.parse(json)); }

export function recordAnswer(s: AppState, skill: SkillId, correct: boolean): AppState {
  const cur = s.stats[skill] ?? { seen: 0, correct: 0, recent: [] };
  return { ...s, stats: { ...s.stats, [skill]: { seen: cur.seen + 1, correct: cur.correct + (correct ? 1 : 0), recent: [...cur.recent, correct ? 1 : 0].slice(-20) } } };
}

/** "Mix it up" weighting: lean (gently) towards skills with a higher recent error rate. */
export function mixWeights(s: AppState, skills: SkillId[]): Record<SkillId, number> {
  const out = {} as Record<SkillId, number>;
  for (const k of skills) {
    const r = s.stats[k]?.recent ?? [];
    const err = r.length >= 5 ? 1 - r.reduce((a, b) => a + b, 0) / r.length : 0.3;
    out[k] = 1 + 2 * err; // between 1× and 3×
  }
  return out;
}

// ---- API key: device-only ----
export const getApiKey = (): string | null => safeGet(API_KEY_KEY);
export const setApiKey = (k: string) => safeSet(API_KEY_KEY, k.trim());
export const removeApiKey = () => { try { localStorage.removeItem(API_KEY_KEY); } catch { /* ignore */ } };
export const maskKey = (k: string) => (k.length <= 8 ? '••••' : `${k.slice(0, 3)}••••••••${k.slice(-4)}`);
