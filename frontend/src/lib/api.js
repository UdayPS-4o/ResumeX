// Tiny wrapper around fetch with JSON helpers and shared error handling.
// Same-origin requests (proxied to the backend by next.config.mjs) carry the
// session cookie automatically, so auth/data calls need no extra config.

async function readError(resp) {
  let detail = '';
  try {
    const data = await resp.json();
    detail = data.error || data.detail || JSON.stringify(data);
  } catch {
    try { detail = await resp.text(); } catch { detail = resp.statusText; }
  }
  return `${resp.status} ${detail || resp.statusText}`;
}

async function jsonFetch(url, body, opts = {}) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: opts.signal,
  });
  if (!resp.ok) throw new Error(await readError(resp));
  return resp.json();
}

// Generic REST helper for the data/auth endpoints (GET/POST/PATCH/DELETE).
async function request(method, url, body) {
  const opts = { method, headers: {} };
  if (body !== undefined) {
    opts.headers['content-type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const resp = await fetch(url, opts);
  if (!resp.ok) {
    const err = new Error(await readError(resp));
    err.status = resp.status;
    throw err;
  }
  return resp.json();
}

export const api = {
  async health() {
    const r = await fetch('/api/health');
    return r.json();
  },

  async listTemplates() {
    const r = await fetch('/api/templates');
    if (!r.ok) throw new Error(await readError(r));
    const data = await r.json();
    return data.templates || [];
  },

  // ── Auth ────────────────────────────────────────────────────────────────────
  // me() throws (status 401) when a login page is required; resolves with
  // { authenticated, user, userCount } otherwise (incl. sole-user auto-login).
  async me() { return request('GET', '/api/auth/me'); },
  async login(login, password) { return request('POST', '/api/auth/login', { login, password }); },
  async signup({ username, email, password }) { return request('POST', '/api/auth/signup', { username, email, password }); },
  async logout() { return request('POST', '/api/auth/logout'); },

  // ── Settings + keys (server-side, encrypted) ─────────────────────────────────
  async getSettings() { return request('GET', '/api/settings'); },
  async saveSettings(payload) { return request('PUT', '/api/settings', payload); },
  async setProviderKey(provider, apiKey) { return request('POST', '/api/settings/keys', { provider, apiKey }); },
  async clearKeys() { return request('DELETE', '/api/settings/keys'); },

  // ── Resumes ──────────────────────────────────────────────────────────────────
  async listResumes() { return request('GET', '/api/resumes'); },
  async getResume(id) { return request('GET', `/api/resumes/${id}`); },
  async createResume(templateId, init) { return request('POST', '/api/resumes', { templateId, init }); },
  async createVariant(parentId, init) { return request('POST', `/api/resumes/${parentId}/variant`, { init }); },
  async duplicateResume(id) { return request('POST', `/api/resumes/${id}/duplicate`); },
  async updateResume(id, patch) { return request('PATCH', `/api/resumes/${id}`, patch); },
  async setResumeDocuments(id, documents) { return request('PATCH', `/api/resumes/${id}/documents`, { documents }); },
  async deleteResume(id) { return request('DELETE', `/api/resumes/${id}`); },

  // ── Application tracker ───────────────────────────────────────────────────────
  async listApplications() { return request('GET', '/api/applications'); },
  async createApplication(init) { return request('POST', '/api/applications', init); },
  async updateApplication(id, patch) { return request('PATCH', `/api/applications/${id}`, patch); },
  async moveApplication(id, status, position) { return request('POST', `/api/applications/${id}/move`, { status, position }); },
  async deleteApplication(id) { return request('DELETE', `/api/applications/${id}`); },
  async bulkUpdateApplications(ids, patch) { return request('POST', '/api/applications/bulk/update', { ids, patch }); },
  async bulkDeleteApplications(ids) { return request('POST', '/api/applications/bulk/delete', { ids }); },

  // ── Board columns (user-defined kanban stages) ──────────────────────────────
  // getBoard() returns { columns: [{id,label,color,position}], cards: { [id]: [] } }.
  async getBoard() { return request('GET', '/api/board'); },
  async createColumn(init) { return request('POST', '/api/board/columns', init); },
  async updateColumn(id, patch) { return request('PATCH', `/api/board/columns/${id}`, patch); },
  async deleteColumn(id, reassignTo) { return request('DELETE', `/api/board/columns/${id}`, reassignTo ? { reassignTo } : {}); },
  async reorderColumns(ids) { return request('POST', '/api/board/columns/reorder', { ids }); },

  // ── LLM + rendering (key/baseUrl are injected server-side from the user's
  // stored settings; the client may still send them — e.g. test-before-save). ──
  async chat({ provider, model, apiKey, baseUrl, messages, resume, temperature, imported, context }, opts = {}) {
    return jsonFetch('/api/chat', { provider, model, apiKey, baseUrl, messages, resume, temperature, imported, context }, opts);
  },

  async render({ templateId, resume, pageSize, formatting }) {
    return jsonFetch('/api/render', { templateId, resume, pageSize, formatting });
  },

  // Compile a rendered document to a PDF blob. `format` ('typst') tells the
  // backend which engine to use; templates render Typst by default.
  async compile(source, { trim = true, format = 'typst' } = {}) {
    const r = await fetch('/api/compile', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ source, format, trim }),
    });
    if (!r.ok) throw new Error(await readError(r));
    return r.blob();
  },

  async atsScore({ provider, model, apiKey, baseUrl, resume, jobDescription }) {
    return jsonFetch('/api/ats-score', { provider, model, apiKey, baseUrl, resume, jobDescription });
  },

  async extract(file) {
    const form = new FormData();
    form.append('file', file);
    const r = await fetch('/api/extract', { method: 'POST', body: form });
    if (!r.ok) throw new Error(await readError(r));
    return r.json(); // { text, filename }
  },

  // ── Job-description analysis ────────────────────────────────────────────────
  // Structured extraction: { company, role, seniority, requiredSkills[],
  // preferredSkills[], responsibilities[], keywords[], suggestedTitle }.
  async extractJd({ provider, model, apiKey, baseUrl, jobDescription }, opts = {}) {
    return jsonFetch('/api/jd', { provider, model, apiKey, baseUrl, jobDescription }, opts);
  },

  // A short resume title for a job, e.g. "Senior Frontend · Stripe".
  async generateTitle({ provider, model, apiKey, baseUrl, jobDescription }, opts = {}) {
    return jsonFetch('/api/jd/title', { provider, model, apiKey, baseUrl, jobDescription }, opts);
  },

  // ── Tailor-to-JD ────────────────────────────────────────────────────────────
  // Returns { message, resume, patch, notes } — patch feeds the suggestion cards.
  async tailor({ provider, model, apiKey, baseUrl, resume, jobDescription, job, strategy }, opts = {}) {
    return jsonFetch('/api/tailor', { provider, model, apiKey, baseUrl, resume, jobDescription, job, strategy }, opts);
  },

  // ── Documents (cover letter / outreach) ─────────────────────────────────────
  async coverLetter({ provider, model, apiKey, baseUrl, resume, jobDescription, job, language, tone }, opts = {}) {
    return jsonFetch('/api/documents/cover-letter', { provider, model, apiKey, baseUrl, resume, jobDescription, job, language, tone }, opts);
  },

  async outreach({ provider, model, apiKey, baseUrl, resume, jobDescription, job, language, channel }, opts = {}) {
    return jsonFetch('/api/documents/outreach', { provider, model, apiKey, baseUrl, resume, jobDescription, job, language, channel }, opts);
  },

  // ── Enrichment wizard ───────────────────────────────────────────────────────
  // analyze → { items:[{ where, section, field, weakness, question }] }
  async enrichAnalyze({ provider, model, apiKey, baseUrl, resume }, opts = {}) {
    return jsonFetch('/api/enrich/analyze', { provider, model, apiKey, baseUrl, resume }, opts);
  },
  // enhance → { message, resume, patch } (patch feeds the suggestion cards)
  async enrichEnhance({ provider, model, apiKey, baseUrl, resume, answers }, opts = {}) {
    return jsonFetch('/api/enrich/enhance', { provider, model, apiKey, baseUrl, resume, answers }, opts);
  },

  // ── Provider health / test connection ───────────────────────────────────────
  // Returns { ok, model, output, error }.
  async testConnection({ provider, model, apiKey, baseUrl }, opts = {}) {
    return jsonFetch('/api/providers/test', { provider, model, apiKey, baseUrl }, opts);
  },
};
