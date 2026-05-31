import { useState } from 'react';
import { api } from '../lib/api.js';
import { PROVIDERS, baseUrlFor, settingsStore } from '../lib/storage.js';

// Provider grouping for the picker. Cloud = hosted APIs (key required, except the
// compatible ones); Local/Custom = bring-your-own OpenAI-compatible endpoint.
const CLOUD = ['gemini', 'anthropic', 'openai', 'openrouter', 'deepseek', 'groq'];
const LOCAL = ['ollama', 'openai_compatible'];

const REASONING_LEVELS = ['auto', 'minimal', 'low', 'medium', 'high'];

export default function SettingsModal({ settings, onClose, onSave }) {
  // Start from a full clone of settings — App replaces state wholesale on save,
  // so we must round-trip every field (tailorStrategy, language, …), not a subset.
  // `apiKeys` starts EMPTY: real keys live encrypted server-side and are never
  // returned, so it only collects NEW keys the user types this session.
  const [draft, setDraft] = useState(() => ({
    ...settings,
    apiKeys: {},
    baseUrls: { ...(settings.baseUrls || {}) },
    features: { coverLetter: true, outreach: true, ...(settings.features || {}) },
    reasoningEffort: settings.reasoningEffort || 'auto',
  }));
  const [test, setTest] = useState(null); // null | { loading } | { ok, output } | { error }
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const provider = draft.provider;
  const cfg = PROVIDERS[provider] || {};
  const isCompatible = cfg.kind === 'compatible';
  const baseUrl = isCompatible ? baseUrlFor(provider, draft) : '';

  function patch(p) {
    setDraft(d => ({ ...d, ...p }));
    setTest(null);
  }

  function pickProvider(p) {
    setDraft(d => ({ ...d, provider: p, model: PROVIDERS[p].defaultModel }));
    setTest(null);
  }

  function setKey(value) {
    setDraft(d => ({ ...d, apiKeys: { ...d.apiKeys, [provider]: value } }));
    setTest(null);
  }

  function setBaseUrl(value) {
    setDraft(d => ({ ...d, baseUrls: { ...d.baseUrls, [provider]: value } }));
    setTest(null);
  }

  function toggleFeature(name) {
    setDraft(d => ({ ...d, features: { ...d.features, [name]: !d.features[name] } }));
  }

  function clearAllKeys() {
    // Flag the clear; it takes effect when the user saves. Drop any newly-typed
    // keys too, since they'd be wiped anyway.
    setDraft(d => ({ ...d, apiKeys: {}, clearKeys: true }));
    setTest(null);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await settingsStore.save(draft);
      onSave(updated);
    } catch (e) {
      setSaveError(e?.message || 'Could not save settings.');
      setSaving(false);
    }
  }

  async function runTest() {
    setTest({ loading: true });
    try {
      const r = await api.testConnection({
        provider,
        model: draft.model,
        apiKey: (draft.apiKeys[provider] || '').trim(),
        baseUrl,
      });
      setTest(r?.ok ? { ok: true, output: r.output } : { error: r?.error || 'Connection failed.' });
    } catch (e) {
      setTest({ error: e?.message || 'Connection failed.' });
    }
  }

  const models = cfg.models || [];

  return (
    <div className="rx-overlay" onClick={onClose}>
      <div className="rx-sheet rx-sheet-md" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <div className="rx-eyebrow">Settings</div>
            <h2 className="text-lg font-semibold text-slate-900">AI provider &amp; preferences</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 grid place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            ✕
          </button>
        </header>

        <div className="px-6 py-5 space-y-6">
          {/* Provider picker — grouped Cloud / Local */}
          <section>
            <div className="rx-eyebrow mb-2">Provider</div>
            <ProviderGroup label="Cloud" ids={CLOUD} active={provider} onPick={pickProvider} />
            <div className="mt-3">
              <ProviderGroup label="Local / Custom" ids={LOCAL} active={provider} onPick={pickProvider} />
            </div>
          </section>

          {/* Model */}
          <section>
            <label className="rx-eyebrow block mb-2" htmlFor="rx-model">Model</label>
            <input
              id="rx-model"
              name="rx-model-name"
              className="field"
              list="rx-model-list"
              value={draft.model || ''}
              onChange={e => patch({ model: e.target.value })}
              placeholder={cfg.defaultModel || 'model name'}
              spellCheck={false}
              autoComplete="off"
              data-1p-ignore="true"
              data-lpignore="true"
              data-bwignore="true"
            />
            <datalist id="rx-model-list">
              {models.map(m => <option key={m} value={m} />)}
            </datalist>
          </section>

          {/* Base URL — compatible providers only */}
          {isCompatible && (
            <section className="reveal">
              <label className="rx-eyebrow block mb-2" htmlFor="rx-baseurl">Base URL</label>
              <input
                id="rx-baseurl"
                className="field font-mono"
                value={baseUrl}
                onChange={e => setBaseUrl(e.target.value)}
                placeholder={cfg.baseUrl || 'http://localhost:1234/v1'}
                spellCheck={false}
                autoComplete="off"
              />
              <p className="text-xs text-slate-500 mt-1.5">OpenAI-compatible endpoint (Chat Completions).</p>
            </section>
          )}

          {/* API key — only when the provider requires one */}
          {cfg.requiresKey && (
            <section className="reveal">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <label className="rx-eyebrow" htmlFor="rx-key">API key</label>
                  {settings.keyPresent?.[provider] && !(draft.apiKeys[provider] || '').trim() && (
                    <span className="inline-flex items-center rounded-full bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 text-[11px] font-medium">
                      ✓ Key saved
                    </span>
                  )}
                </div>
                {cfg.keyUrl && (
                  <a
                    href={cfg.keyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-brand-600 hover:text-brand-700 hover:underline"
                  >
                    Get a key ↗
                  </a>
                )}
              </div>
              <KeyInput
                value={draft.apiKeys[provider] || ''}
                onChange={setKey}
                placeholder={settings.keyPresent?.[provider] ? '•••••••• — enter a new key to replace' : 'sk-…'}
              />
              {cfg.keyHint && <p className="text-xs text-slate-500 mt-1.5">{cfg.keyHint}</p>}
              <p className="text-xs text-slate-400 mt-1">Stored encrypted on the server.</p>
            </section>
          )}

          {/* Test connection */}
          <section>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                className="rx-btn rx-btn-soft rx-btn-sm"
                onClick={runTest}
                disabled={test?.loading || !draft.model}
              >
                {test?.loading ? 'Testing…' : 'Test connection'}
              </button>
              {test?.ok && (
                <span className="chip chip-match">Connected{test.output ? ` · ${truncate(test.output)}` : ''}</span>
              )}
              {test?.error && <span className="chip chip-miss">{truncate(test.error, 80)}</span>}
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Reasoning effort */}
          <section>
            <label className="rx-eyebrow block mb-2" htmlFor="rx-reasoning">Reasoning effort</label>
            <select
              id="rx-reasoning"
              className="field cursor-pointer"
              value={draft.reasoningEffort}
              onChange={e => setDraft(d => ({ ...d, reasoningEffort: e.target.value }))}
            >
              {REASONING_LEVELS.map(l => (
                <option key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}</option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1.5">Applies to reasoning-capable models; “Auto” lets the model decide.</p>
          </section>

          {/* Feature toggles */}
          <section>
            <div className="rx-eyebrow mb-2">Features</div>
            <div className="space-y-2">
              <Toggle
                label="Cover letter generator"
                hint="Draft a tailored cover letter for a job."
                on={!!draft.features.coverLetter}
                onChange={() => toggleFeature('coverLetter')}
              />
              <Toggle
                label="Outreach messages"
                hint="Generate recruiter / referral outreach."
                on={!!draft.features.outreach}
                onChange={() => toggleFeature('outreach')}
              />
            </div>
          </section>

          {/* Danger zone */}
          <section className="rounded-xl border border-red-100 bg-red-50/40 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-red-700">Clear all API keys</div>
                <div className="text-xs text-red-600/80">
                  {draft.clearKeys
                    ? 'Keys will be cleared on save.'
                    : 'Removes every encrypted key stored on the server.'}
                </div>
              </div>
              <button
                className="rx-btn rx-btn-danger rx-btn-sm"
                onClick={clearAllKeys}
                disabled={draft.clearKeys}
              >
                {draft.clearKeys ? 'Will clear' : 'Clear keys'}
              </button>
            </div>
          </section>
        </div>

        <footer className="px-6 py-4 border-t border-slate-100">
          {saveError && (
            <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {saveError}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button className="rx-btn rx-btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="rx-btn rx-btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function ProviderGroup({ label, ids, active, onPick }) {
  return (
    <div>
      <div className="text-[11px] font-medium text-slate-400 mb-1.5">{label}</div>
      <div className="flex flex-wrap gap-2">
        {ids.map(id => {
          const p = PROVIDERS[id];
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onPick(id)}
              aria-pressed={isActive}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                isActive
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-slate-900'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function KeyInput({ value, onChange, placeholder = 'sk-…' }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <input
        id="rx-key"
        name="rx-key-value"
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="new-password"
        data-1p-ignore="true"
        data-lpignore="true"
        data-bwignore="true"
        className="field font-mono"
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="rx-btn rx-btn-ghost rx-btn-sm shrink-0"
      >
        {show ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}

function Toggle({ label, hint, on, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={on}
      className="w-full flex items-center justify-between gap-3 text-left rounded-xl border border-slate-200 bg-white px-4 py-2.5 hover:border-brand-300 transition-colors"
    >
      <span>
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        <span className="block text-xs text-slate-500">{hint}</span>
      </span>
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          on ? 'bg-brand-500' : 'bg-slate-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
            on ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  );
}

function truncate(s, n = 40) {
  s = String(s || '');
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
