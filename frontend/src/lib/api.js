// Tiny wrapper around fetch with JSON helpers and shared error handling.

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

  // Non-streaming chat. Returns { message, resume, patch } once the model has
  // finished — the UI shows a typing indicator meanwhile, then reveals the reply
  // and suggestion cards atomically. Pass { signal } to make it abortable.
  async chat({ provider, model, apiKey, messages, resume, temperature, imported }, opts = {}) {
    return jsonFetch('/api/chat', { provider, model, apiKey, messages, resume, temperature, imported }, opts);
  },

  async render({ templateId, resume, pageSize }) {
    return jsonFetch('/api/render', { templateId, resume, pageSize });
  },

  async seed(templateId) {
    const r = await fetch(`/api/templates/${encodeURIComponent(templateId)}/seed`);
    if (!r.ok) throw new Error(await readError(r));
    return r.json(); // { seed }
  },

  // Compile a rendered document to a PDF blob. `format` ('typst' | 'latex')
  // tells the backend which engine to use; templates render Typst by default.
  async compile(source, { trim = true, format = 'typst' } = {}) {
    const r = await fetch('/api/compile', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ source, format, trim }),
    });
    if (!r.ok) throw new Error(await readError(r));
    return r.blob();
  },

  async atsScore({ provider, model, apiKey, resume, jobDescription }) {
    return jsonFetch('/api/ats-score', { provider, model, apiKey, resume, jobDescription });
  },

  async extract(file) {
    const form = new FormData();
    form.append('file', file);
    const r = await fetch('/api/extract', { method: 'POST', body: form });
    if (!r.ok) throw new Error(await readError(r));
    return r.json(); // { text, filename }
  },
};
