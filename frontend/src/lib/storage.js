// Server-backed persistence. Everything (settings, API keys, resumes, tracker
// cards) lives in the backend SQLite database now, scoped to the logged-in user.
// The three stores expose ASYNC methods that proxy the REST API in lib/api.js.
//
// The provider registry + pure helpers below stay client-side (no I/O) so UI
// code can read them synchronously during render.

import { api } from './api.js';

// ── Provider config ──────────────────────────────────────────────────────────
// `kind: 'native'` providers use a dedicated SDK on the backend. `kind:
// 'compatible'` providers all speak the OpenAI Chat Completions wire format and
// are served by one parametrized client (baseUrl + optional key). Keep these ids
// in sync with packages/llm/src/providers.

export const PROVIDERS = {
  gemini: {
    label: 'Google Gemini',
    kind: 'native',
    defaultModel: 'gemini-flash-latest',
    models: ['gemini-pro-latest', 'gemini-flash-latest', 'gemini-flash-lite-latest'],
    keyHint: 'Free key at aistudio.google.com/apikey',
    keyUrl: 'https://aistudio.google.com/apikey',
    requiresKey: true,
  },
  anthropic: {
    label: 'Anthropic Claude',
    kind: 'native',
    defaultModel: 'claude-haiku-4-5-20251001',
    models: ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6', 'claude-opus-4-7'],
    keyHint: 'Key at console.anthropic.com',
    keyUrl: 'https://console.anthropic.com',
    requiresKey: true,
  },
  openai: {
    label: 'OpenAI',
    kind: 'native',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'],
    keyHint: 'Key at platform.openai.com/api-keys',
    keyUrl: 'https://platform.openai.com/api-keys',
    requiresKey: true,
  },
  ollama: {
    label: 'Ollama (local)',
    kind: 'compatible',
    defaultModel: 'llama3.1',
    models: ['llama3.1', 'qwen2.5', 'mistral', 'phi3'],
    keyHint: 'No key needed — runs on your machine',
    keyUrl: 'https://ollama.com/download',
    baseUrl: 'http://localhost:11434/v1',
    requiresKey: false,
  },
  openrouter: {
    label: 'OpenRouter',
    kind: 'compatible',
    defaultModel: 'openrouter/free',
    models: [
      'openrouter/free',
      'google/gemma-4-31b-it:free',
      'google/gemma-4-26b-a4b-it:free',
      'minimax/minimax-m3:free',
      'z-ai/glm-5.2:free',
      'openai/gpt-4o-mini',
      'anthropic/claude-3.5-sonnet',
      'google/gemini-flash-1.5',
      'meta-llama/llama-3.1-70b-instruct',
    ],
    keyHint: 'Key at openrouter.ai/keys',
    keyUrl: 'https://openrouter.ai/keys',
    baseUrl: 'https://openrouter.ai/api/v1',
    requiresKey: true,
  },
  deepseek: {
    label: 'DeepSeek',
    kind: 'compatible',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    keyHint: 'Key at platform.deepseek.com',
    keyUrl: 'https://platform.deepseek.com',
    baseUrl: 'https://api.deepseek.com/v1',
    requiresKey: true,
  },
  groq: {
    label: 'Groq',
    kind: 'compatible',
    defaultModel: 'llama-3.3-70b-versatile',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    keyHint: 'Key at console.groq.com/keys',
    keyUrl: 'https://console.groq.com/keys',
    baseUrl: 'https://api.groq.com/openai/v1',
    requiresKey: true,
  },
  openai_compatible: {
    label: 'OpenAI-compatible',
    kind: 'compatible',
    defaultModel: '',
    models: [],
    keyHint: 'Any OpenAI-compatible endpoint (LM Studio, vLLM, llama.cpp…)',
    keyUrl: '',
    baseUrl: 'http://localhost:1234/v1',
    requiresKey: false,
  },
};

// Effective base URL for a provider: user override → registry default → ''.
export function baseUrlFor(provider, settings) {
  return (settings?.baseUrls?.[provider] || PROVIDERS[provider]?.baseUrl || '').trim();
}

// Whether the current provider is usable. Keys live server-side now, so we check
// the `keyPresent` map the server returns rather than a raw key value.
export function providerReady(settings) {
  const p = PROVIDERS[settings?.provider];
  if (!p) return false;
  if (!p.requiresKey) return true;
  return !!settings?.keyPresent?.[settings.provider];
}

// ── Resume content shape ─────────────────────────────────────────────────────
// (The canonical content schema also lives in @resumex/core; this mirror keeps
// the frontend dependency-light for fresh entries.)

export const emptyResume = () => ({
  name: '',
  headline: '',
  contact: { email: '', phone: '', location: '', website: '', linkedin: '', github: '' },
  summary: '',
  experience: [],
  education: [],
  projects: [],
  skills: [],
  certifications: [],
  awards: [],
  sectionOrder: [],
});

// ── Settings ─────────────────────────────────────────────────────────────────
// Client-side settings object. `apiKeys` is kept (always empty) for backward
// compatibility with components that read settings.apiKeys?.[provider] — real
// keys never live here. `keyPresent` is the server's per-provider presence map.

export const defaultSettings = () => ({
  provider: 'gemini',
  model: PROVIDERS.gemini.defaultModel,
  apiKeys: {},                  // legacy-compat: stays empty; real keys are server-side
  keyPresent: {},               // { provider: boolean } — from the server
  baseUrls: {},                 // per-provider base URL overrides (compatible providers)
  reasoningEffort: 'auto',      // auto | minimal | low | medium | high (reasoning models only)
  features: { coverLetter: true, outreach: true },
  tailorStrategy: 'keywords',   // nudge | keywords | full
  language: 'en',               // content-generation language (UI stays English for now)
});

export const settingsStore = {
  async load() {
    try {
      const s = await api.getSettings();
      return { ...defaultSettings(), ...s };
    } catch {
      return defaultSettings();
    }
  },
  // Persists settings fields and, when present, newly-typed API keys (a map of
  // provider → key in `s.apiKeys`) and/or a `clearKeys` flag. Returns the fresh
  // server settings (with an updated keyPresent map).
  async save(s) {
    const payload = {
      provider: s.provider,
      model: s.model,
      baseUrls: s.baseUrls || {},
      reasoningEffort: s.reasoningEffort,
      features: s.features,
      tailorStrategy: s.tailorStrategy,
      language: s.language,
    };
    if (s.apiKeys && Object.values(s.apiKeys).some((v) => String(v || '').trim())) {
      payload.apiKeys = s.apiKeys;
    }
    if (s.clearKeys) payload.clearKeys = true;
    return { ...defaultSettings(), ...(await api.saveSettings(payload)) };
  },
};

// ── Resume CRUD ──────────────────────────────────────────────────────────────
// Each entry: { id, title, templateId, pageSize, trim, resume, messages,
//   kind:'master'|'tailored', parentId, job, matchScore, documents,
//   createdAt, updatedAt }. A master is any entry with parentId == null.
// The server normalizes these fields, so the shape matches the old store.

export const resumeStore = {
  async list() {
    return (await api.listResumes()).resumes || [];
  },
  async listMasters() {
    return (await this.list()).filter((e) => !e.parentId);
  },
  async listVariants(parentId) {
    return (await this.list()).filter((e) => e.parentId === parentId);
  },
  async get(id) {
    try {
      return (await api.getResume(id)).resume;
    } catch {
      return null;
    }
  },
  async create(templateId, init = {}) {
    return (await api.createResume(templateId, init)).resume;
  },
  async createVariant(parentId, init = {}) {
    const r = await api.createVariant(parentId, init);
    return r.resume;
  },
  async update(id, patch) {
    return (await api.updateResume(id, patch)).resume;
  },
  async setDocuments(id, docs) {
    return (await api.setResumeDocuments(id, docs)).resume;
  },
  async delete(id) {
    await api.deleteResume(id);
  },
  async duplicate(id) {
    return (await api.duplicateResume(id)).resume;
  },
};

// ── Application tracker CRUD ──────────────────────────────────────────────────
// Card: { id, resumeId, parentId, company, role, status, position, notes,
//   appliedAt, createdAt, updatedAt } — `status` is a board-column id.
//
// Columns are user-defined now (add / rename / recolour / reorder / delete); the
// server is authoritative. DEFAULT_COLUMNS is only a client-side placeholder for
// the first paint before boardStore.load() resolves — keep it in sync with
// backend/src/repo/boardColumns.js.

export const DEFAULT_COLUMNS = [
  { id: 'wishlist', label: 'Saved', color: '#94a3b8' },
  { id: 'applied', label: 'Applied', color: '#2563eb' },
  { id: 'interview', label: 'Interview', color: '#7c3aed' },
  { id: 'offer', label: 'Offer', color: '#0ea5e9' },
  { id: 'accepted', label: 'Accepted', color: '#16a34a' },
  { id: 'rejected', label: 'Rejected', color: '#e11d48' },
  { id: 'ghosted', label: 'Ghosted', color: '#a16207' },
];

// Palette offered when adding/recolouring a column.
export const COLUMN_COLORS = [
  '#94a3b8', '#2563eb', '#7c3aed', '#0ea5e9', '#16a34a',
  '#e11d48', '#a16207', '#db2777', '#0d9488', '#f59e0b',
];

// Board = column metadata + cards grouped by column id, in one snapshot.
export const boardStore = {
  async load() {
    const { columns, cards } = await api.getBoard();
    return { columns: columns || [], cards: cards || {} };
  },
  async createColumn(init = {}) {
    return (await api.createColumn(init)).column;
  },
  async updateColumn(id, patch) {
    return (await api.updateColumn(id, patch)).column;
  },
  async deleteColumn(id, reassignTo = null) {
    return api.deleteColumn(id, reassignTo);
  },
  async reorderColumns(ids) {
    return (await api.reorderColumns(ids)).columns;
  },
};

export const applicationStore = {
  async all() {
    return (await api.listApplications()).applications || [];
  },
  async create(init = {}) {
    return (await api.createApplication(init)).card;
  },
  async update(id, patch) {
    return (await api.updateApplication(id, patch)).card;
  },
  // Move a card to a status at a target index, renumbering that column.
  async move(id, status, position) {
    return (await api.moveApplication(id, status, position)).card;
  },
  async delete(id) {
    await api.deleteApplication(id);
  },
  async bulkUpdate(ids, patch) {
    await api.bulkUpdateApplications(ids, patch);
  },
  async bulkDelete(ids) {
    await api.bulkDeleteApplications(ids);
  },
};
