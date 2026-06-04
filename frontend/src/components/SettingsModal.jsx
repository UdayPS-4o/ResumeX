import { useState } from 'react';
import { PROVIDERS } from '../lib/storage.js';

export default function SettingsModal({ settings, onClose, onSave }) {
  const [draft, setDraft] = useState({
    provider: settings.provider,
    model: settings.model,
    apiKeys: { ...(settings.apiKeys || {}) },
  });

  function pickProvider(p) {
    const cfg = PROVIDERS[p];
    setDraft(d => ({ ...d, provider: p, model: cfg.defaultModel }));
  }

  function setKey(provider, value) {
    setDraft(d => ({ ...d, apiKeys: { ...d.apiKeys, [provider]: value } }));
  }

  const currentModels = PROVIDERS[draft.provider].models;
  const isCustomModel = !currentModels.includes(draft.model) && draft.model !== '';

  return (
    <Modal onClose={onClose} title="Resumex Settings">
      <div className="space-y-6">
        <section>
          <Label>Select AI Provider</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
            {Object.entries(PROVIDERS).map(([id, p]) => {
              const isActive = draft.provider === id;
              return (
                <button
                  key={id}
                  onClick={() => pickProvider(id)}
                  className={`text-left p-4 rounded-xl border-2 transition-all duration-200 relative overflow-hidden group ${
                    isActive
                      ? 'border-brand-500 bg-brand-50/50 shadow-sm shadow-brand-100'
                      : 'border-slate-200 bg-white hover:border-brand-300 hover:shadow-md'
                  }`}
                >
                  <div className={`font-semibold text-sm ${isActive ? 'text-brand-900' : 'text-slate-800'}`}>
                    {p.label}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    {p.keyHint}
                  </div>
                  {p.keyUrl && (
                    <a
                      href={p.keyUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 hover:text-brand-800 mt-2 hover:underline"
                    >
                      Get API Key ↗
                    </a>
                  )}
                  {isActive && (
                    <div className="absolute top-0 right-0 w-12 h-12 bg-brand-500/10 rounded-bl-[100%] transition-opacity" />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <Label>Model Selection</Label>
          <div className="mt-2 space-y-3">
            <select
              value={isCustomModel ? 'other' : draft.model}
              onChange={e => {
                if (e.target.value === 'other') {
                  setDraft(d => ({ ...d, model: 'custom-model-name' }));
                } else {
                  setDraft(d => ({ ...d, model: e.target.value }));
                }
              }}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white/80 text-sm font-medium text-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all cursor-pointer shadow-sm"
            >
              {currentModels.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
              <option value="other">Other (Custom Model)...</option>
            </select>

            {isCustomModel && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <input
                  type="text"
                  value={draft.model === 'custom-model-name' ? '' : draft.model}
                  onChange={e => setDraft(d => ({ ...d, model: e.target.value }))}
                  placeholder="Enter custom model name (e.g., gpt-4-turbo)"
                  className="w-full px-4 py-2.5 rounded-xl border border-brand-300 bg-brand-50/30 text-sm font-medium text-slate-900 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 outline-none transition-all placeholder:text-slate-400 shadow-sm"
                  autoFocus
                />
              </div>
            )}
          </div>
        </section>

        <section>
          <Label>API Keys</Label>
          <p className="text-xs text-slate-500 mt-1 mb-3">
            Stored securely in your browser only. Never sent anywhere except directly to the AI provider you choose.
          </p>
          <div className="space-y-3">
            {Object.entries(PROVIDERS).map(([id, p]) => (
              <KeyInput
                key={id}
                label={p.label}
                value={draft.apiKeys[id] || ''}
                onChange={v => setKey(id, v)}
                active={draft.provider === id}
              />
            ))}
          </div>
        </section>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200/60 mt-4">
          <button 
            onClick={onClose} 
            className="px-5 py-2.5 text-sm font-medium rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(draft)}
            className="px-6 py-2.5 text-sm font-bold rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 text-white hover:from-brand-700 hover:to-indigo-700 shadow-lg shadow-brand-500/25 transition-all hover:shadow-brand-500/40 transform hover:-translate-y-0.5"
          >
            Save Settings
          </button>
        </div>
      </div>
    </Modal>
  );
}

function KeyInput({ label, value, onChange, active }) {
  const [show, setShow] = useState(false);
  return (
    <div className={`flex items-center gap-3 border-2 rounded-xl px-4 py-2.5 transition-all ${
      active 
        ? 'border-brand-400 bg-brand-50/50 shadow-sm' 
        : 'border-slate-200 bg-white/50 opacity-60 hover:opacity-100'
    }`}>
      <div className={`text-xs font-bold w-32 shrink-0 ${active ? 'text-brand-900' : 'text-slate-600'}`}>
        {label}
      </div>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="sk-…"
        spellCheck={false}
        autoComplete="off"
        className="flex-1 bg-transparent text-sm font-mono outline-none placeholder:text-slate-400 text-slate-800"
      />
      <button
        onClick={() => setShow(s => !s)}
        className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-brand-600 px-2 py-1 rounded transition-colors"
      >
        {show ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}

function Label({ children }) {
  return <label className="block text-xs font-bold uppercase tracking-widest text-slate-500">{children}</label>;
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm grid place-items-center p-4 sm:p-6 overflow-y-auto slide-up">
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-2xl border border-white/50 my-auto">
        <header className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white/50 rounded-t-2xl">
          <h2 className="text-xl font-extrabold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            {title}
          </h2>
          <button 
            onClick={onClose} 
            className="w-8 h-8 grid place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            ✕
          </button>
        </header>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
