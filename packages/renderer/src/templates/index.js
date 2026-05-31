import { renderJake, META as jakeMeta } from './typst/jake.js';
import { renderClassic, META as classicMeta } from './typst/classic.js';
import { renderCompact, META as compactMeta } from './typst/compact.js';
import { renderModern, META as modernMeta } from './typst/modern.js';
import { renderExecutive, META as executiveMeta } from './typst/executive.js';
import { renderDeedy, META as deedyMeta } from './typst/deedy.js';
import { renderAlta, META as altaMeta } from './typst/alta.js';
import { renderMinimalist, META as minimalistMeta } from './typst/minimalist.js';

// Every template now renders **Typst** (each META carries `format: 'typst'`) and
// compiles via the Typst engine.
export const TEMPLATES = {
  jake: { meta: jakeMeta, render: renderJake },
  classic: { meta: classicMeta, render: renderClassic },
  minimalist: { meta: minimalistMeta, render: renderMinimalist },
  compact: { meta: compactMeta, render: renderCompact },
  executive: { meta: executiveMeta, render: renderExecutive },
  modern: { meta: modernMeta, render: renderModern },
  alta: { meta: altaMeta, render: renderAlta },
  deedy: { meta: deedyMeta, render: renderDeedy },
};

export function listTemplates() {
  return Object.entries(TEMPLATES).map(([id, t]) => ({
    id,
    ...t.meta,
  }));
}

export function renderTemplate(id, resume, opts = {}) {
  const t = TEMPLATES[id];
  if (!t) {
    const err = new Error(`Unknown template "${id}"`);
    err.status = 404;
    throw err;
  }
  return t.render(resume, opts);
}

// The engine a template renders for ('typst') — drives compile dispatch.
export function getFormat(id) {
  return TEMPLATES[id]?.meta?.format || 'typst';
}
