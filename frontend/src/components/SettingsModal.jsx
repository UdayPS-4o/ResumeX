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

  return (
    <Modal onClose={onClose} title="Settings">
      <div className="space-y-5">
        <section>
          <Label>AI provider</Label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {Object.entries(PROVIDERS).map(([id, p]) => (
              <button
                key={id}
                onClick={() => pickProvider(id)}
                className={`text-left px-3 py-2 rounded-lg border transition ${
                  draft.provider === id
                    ? 'border-brand-500 bg-brand-50/60'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="font-medium text-sm text-slate-900">{p.label}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{p.keyHint}</div>
              </button>
            ))}
          </div>
        </section>

        <section>
          <Label>Model</Label>
          <select
            value={draft.model}
            onChange={e => setDraft(d => ({ ...d, model: e.target.value }))}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none"
          >
            {PROVIDERS[draft.provider].models.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </section>

        <section>
          <Label>API keys</Label>
          <p className="text-[11px] text-slate-500 mt-0.5 mb-2">
            Stored in your browser only — never sent to anything but the provider you choose.
          </p>
          <div className="space-y-2">
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

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button onClick={onClose} className="px-3 py-2 text-sm rounded-lg text-slate-600 hover:bg-slate-100 transition">
            Cancel
          </button>
          <button
            onClick={() => onSave(draft)}
            className="px-4 py-2 text-sm rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition"
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}

function KeyInput({ label, value, onChange, active }) {
  const [show, setShow] = useState(false);
  return (
    <div className={`flex items-center gap-2 border rounded-lg px-2.5 py-1.5 ${active ? 'border-brand-300 bg-brand-50/30' : 'border-slate-200'}`}>
      <div className="text-xs text-slate-600 w-24 shrink-0">{label}</div>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="sk-…"
        spellCheck={false}
        autoComplete="off"
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
      />
      <button
        onClick={() => setShow(s => !s)}
        className="text-[10px] uppercase tracking-wider text-slate-400 hover:text-slate-700 px-1"
      >
        {show ? 'hide' : 'show'}
      </button>
    </div>
  );
}

function Label({ children }) {
  return <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">{children}</label>;
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm grid place-items-center p-4 slide-up">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-200">
        <header className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="w-7 h-7 grid place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            ✕
          </button>
        </header>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
