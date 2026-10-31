import { useRef, useState } from 'react';
import { GLOSSARY } from '../data/glossary';
import { ERROR_TEXT, ExplainError, listModels } from '../lib/openai';
import { DEFAULT_MODEL, defaultState, exportBackup, getApiKey, importBackup, maskKey, removeApiKey, setApiKey } from '../lib/storage';
import { Cards, Segmented, Toast, TopBar } from '../ui/components';
import { back, useApp } from '../ui/state';
import { FormatToggle } from './Home';

export function Settings() {
  const { state, update, replace } = useApp();
  const [key, setKey] = useState<string | null>(() => getApiKey());
  const [draft, setDraft] = useState('');
  const [model, setModel] = useState(state.settings.model);
  const [modelCheck, setModelCheck] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<typeof state.settings>) => update((s) => ({ ...s, settings: { ...s.settings, ...patch } }));

  const saveKey = () => {
    const k = draft.trim();
    if (!k) return;
    setApiKey(k);
    setKey(k);
    setDraft('');
    setToast('Key saved on this device');
  };

  const checkModel = async () => {
    if (!key) return;
    setModelCheck('Checking…');
    try {
      const ids = await listModels(key);
      setModelCheck(ids.includes(model) ? `✓ “${model}” is available to your key.` : `“${model}” wasn’t found for your key. Available models include: ${ids.filter((x) => x.startsWith('gpt')).slice(0, 8).join(', ')}`);
    } catch (e) {
      setModelCheck(e instanceof ExplainError ? ERROR_TEXT[e.kind] : 'Couldn’t reach OpenAI.');
    }
  };

  const doExport = async () => {
    const name = `holdem-coach-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const json = exportBackup(state);
    // iPhone home-screen apps can't reliably "download" a file; use the share sheet
    // (Save to Files, AirDrop, Mail…) where available, and a normal download elsewhere.
    try {
      const file = new File([json], name, { type: 'application/json' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Hold’em Coach backup' });
        return;
      }
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return; // user closed the share sheet
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const doImport = async (f: File) => {
    try {
      replace(importBackup(await f.text()));
      setToast('Backup restored');
    } catch (e) {
      setToast(`Couldn’t import: ${(e as Error).message}`);
    }
  };

  return (
    <div className="screen">
      <h1>Settings</h1>

      <h2>Table</h2>
      <div className="card-section">
        <div className="setting"><label className="lbl">Default format</label><FormatToggle /></div>
        <div className="setting">
          <label className="switch-row">
            <div><strong>Four-colour deck</strong><div className="tiny">Diamonds blue, clubs green. Suit symbols always show.</div></div>
            <input type="checkbox" className="switch" checked={state.settings.fourColor} onChange={(e) => set({ fourColor: e.target.checked })} aria-label="Four-colour deck" />
          </label>
          <div style={{ marginTop: 10 }}><Cards cards={['As', 'Kh', 'Qd', 'Jc']} size="sm" /></div>
        </div>
        <div className="setting">
          <label className="lbl">Appearance</label>
          <Segmented label="Appearance" value={state.settings.theme} onChange={(t) => set({ theme: t })} options={[{ id: 'system', label: 'Auto' }, { id: 'light', label: 'Light' }, { id: 'dark', label: 'Dark' }]} />
        </div>
      </div>

      <h2>“Explain more” (optional)</h2>
      <div className="card-section">
        <div className="setting">
          <label className="lbl" htmlFor="key">OpenAI API key</label>
          {key ? (
            <>
              <div className="keybox" aria-label="Saved key (masked)">{maskKey(key)}</div>
              <div className="row" style={{ marginTop: 10 }}>
                <button className="btn small danger" onClick={() => { removeApiKey(); setKey(null); setToast('Key removed'); }}>Remove key</button>
              </div>
            </>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); saveKey(); }}>
              <input id="key" className="input" type="password" autoComplete="off" autoCapitalize="off" spellCheck={false} placeholder="sk-…" value={draft} onChange={(e) => setDraft(e.target.value)} />
              <button className="btn primary" style={{ marginTop: 10 }} disabled={!draft.trim()}>Save key</button>
            </form>
          )}
          <p className="tiny" style={{ marginTop: 10, marginBottom: 0 }}>
            Stored only in this app on this device and sent only to OpenAI. Never included in backups.
            Use a key made just for this app, and set a low monthly spending limit on your OpenAI account.
            On iPhone, paste the key in the home-screen app itself – it doesn’t share storage with Safari.
          </p>
        </div>
        <div className="setting">
          <label className="lbl" htmlFor="model">Model</label>
          <div className="row">
            <input id="model" className="input" value={model} autoCapitalize="off" spellCheck={false} onChange={(e) => setModel(e.target.value)} onBlur={() => set({ model: model.trim() || DEFAULT_MODEL })} />
            {key && <button className="btn small" style={{ flex: 'none' }} onClick={checkModel}>Check</button>}
          </div>
          {modelCheck && <p className="small" style={{ marginTop: 8 }}>{modelCheck}</p>}
          <p className="tiny" style={{ marginTop: 8, marginBottom: 0 }}>Default: {DEFAULT_MODEL} (OpenAI’s cheapest current model). Answers are capped at ~350 tokens – a fraction of a cent each.</p>
          {model !== DEFAULT_MODEL && <button className="btn small ghost" style={{ paddingLeft: 0 }} onClick={() => { setModel(DEFAULT_MODEL); set({ model: DEFAULT_MODEL }); }}>Reset to default</button>}
        </div>
      </div>

      <h2>Your data</h2>
      <div className="card-section">
        <div className="setting stack">
          <button className="btn" onClick={() => void doExport()}>Export backup</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Import backup</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void doImport(f); e.target.value = ''; }} />
          <p className="tiny" style={{ margin: 0 }}>Backups include progress and settings, never your API key. On iPhone, choose “Save to Files”.</p>
        </div>
        <div className="setting">
          <button className="btn danger" onClick={() => {
            if (confirm('Reset all progress and settings? Your API key stays unless you remove it above.')) { replace(defaultState()); setModel(DEFAULT_MODEL); setToast('Progress reset'); }
          }}>Reset progress</button>
        </div>
      </div>

      <h2>About</h2>
      <p className="small muted">
        Starting-hand charts are a conservative beginner composite, not solver output, assuming 100 big-blind stacks:
        full ring = loose, passive live home game; 6-max = online. You can edit them in <code>src/data/ranges/index.ts</code>.
        Percentages in drills are computed exactly from the cards.
      </p>
      {toast && <Toast text={toast} onDone={() => setToast(null)} />}
    </div>
  );
}

export function Glossary() {
  const keys = Object.keys(GLOSSARY).sort((a, b) => GLOSSARY[a].term.localeCompare(GLOSSARY[b].term));
  return (
    <div className="screen no-tabs">
      <TopBar title="Glossary" onBack={back} />
      <div className="card-section">
        {keys.map((k) => (
          <div className="gloss-item" key={k} id={`g-${k}`}>
            <strong>{GLOSSARY[k].term}</strong>
            <div className="small muted">{GLOSSARY[k].def}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
