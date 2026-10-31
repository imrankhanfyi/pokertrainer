import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { type AppState, loadState, saveState } from '../lib/storage';

interface Ctx {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
  replace: (s: AppState) => void;
}

const StateCtx = createContext<Ctx | null>(null);

export function StateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState());
  useEffect(() => saveState(state), [state]);
  useEffect(() => {
    const root = document.documentElement;
    if (state.settings.theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', state.settings.theme);
    root.setAttribute('data-fourcolor', String(state.settings.fourColor));
  }, [state.settings.theme, state.settings.fourColor]);
  const update = useCallback((fn: (s: AppState) => AppState) => setState(fn), []);
  const replace = useCallback((s: AppState) => setState(s), []);
  const v = useMemo(() => ({ state, update, replace }), [state, update, replace]);
  return <StateCtx.Provider value={v}>{children}</StateCtx.Provider>;
}

export function useApp(): Ctx {
  const c = useContext(StateCtx);
  if (!c) throw new Error('useApp outside provider');
  return c;
}

// ---------- tiny hash router ----------
export function useHashRoute(): [string[], (path: string) => void] {
  const read = () => window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const [parts, setParts] = useState<string[]>(read);
  useEffect(() => {
    const on = () => { setParts(read()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = useCallback((path: string) => { window.location.hash = path.startsWith('/') ? path : `/${path}`; }, []);
  return [parts, go];
}

export const back = () => (window.history.length > 1 ? window.history.back() : (window.location.hash = '/'));
