// localStorage-backed persistence for settings + multiple resumes.

const KEYS = {
  settings: 'resumex.settings.v2',
  resumes: 'resumex.resumes.v2',
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ── Provider config ──

export const PROVIDERS = {
  gemini: {
    label: 'Google Gemini',
    defaultModel: 'gemini-3.1-flash-lite',
    models: ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3-flash-preview'],
    keyHint: 'Free key at aistudio.google.com/apikey',
  },
  anthropic: {
    label: 'Anthropic Claude',
    defaultModel: 'claude-haiku-4-5-20251001',
    models: ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6', 'claude-opus-4-7'],
    keyHint: 'Key at console.anthropic.com',
  },
  openai: {
    label: 'OpenAI',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'],
    keyHint: 'Key at platform.openai.com/api-keys',
  },
};

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

export const defaultSettings = () => ({
  provider: 'gemini',
  model: PROVIDERS.gemini.defaultModel,
  apiKeys: { gemini: '', anthropic: '', openai: '' },
});

// ── Settings CRUD ──

export const settingsStore = {
  load()  { return { ...defaultSettings(), ...read(KEYS.settings, {}) }; },
  save(s) { write(KEYS.settings, s); },
};

// ── Resume CRUD ──
// Each resume entry: { id, title, templateId, resume, messages, createdAt, updatedAt }

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export const resumeStore = {
  list() {
    const all = read(KEYS.resumes, []);
    return all.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  },

  get(id) {
    return read(KEYS.resumes, []).find(r => r.id === id) || null;
  },

  create(templateId, init = {}) {
    const entry = {
      id: uid(),
      title: init.title || 'Untitled Resume',
      templateId,
      pageSize: init.pageSize || 'a4',
      trim: init.trim ?? true,
      resume: init.resume || emptyResume(),
      messages: init.messages || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const all = read(KEYS.resumes, []);
    all.push(entry);
    write(KEYS.resumes, all);
    return entry;
  },

  update(id, patch) {
    const all = read(KEYS.resumes, []);
    const idx = all.findIndex(r => r.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...patch, updatedAt: Date.now() };
    write(KEYS.resumes, all);
    return all[idx];
  },

  delete(id) {
    const all = read(KEYS.resumes, []).filter(r => r.id !== id);
    write(KEYS.resumes, all);
  },

  duplicate(id) {
    const src = this.get(id);
    if (!src) return null;
    const entry = {
      ...src,
      id: uid(),
      title: `${src.title} (copy)`,
      messages: [...src.messages],
      resume: JSON.parse(JSON.stringify(src.resume)),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const all = read(KEYS.resumes, []);
    all.push(entry);
    write(KEYS.resumes, all);
    return entry;
  },
};
