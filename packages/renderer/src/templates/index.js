import { renderJake, META as jakeMeta } from './typst/jake.js';
import { renderClassic, META as classicMeta } from './typst/classic.js';
import { renderCompact, META as compactMeta } from './typst/compact.js';
import { renderModern, META as modernMeta, SEED_RESUME as modernSeed } from './typst/modern.js';
import { renderExecutive, META as executiveMeta, SEED_RESUME as executiveSeed } from './typst/executive.js';
import { renderNeat, META as neatMeta } from './typst/neat.js';
import { renderDeedy, META as deedyMeta } from './typst/deedy.js';
import { renderAlta, META as altaMeta } from './typst/alta.js';
import { renderMinimalist, META as minimalistMeta } from './typst/minimalist.js';
import { renderAttractive, META as attractiveMeta } from './typst/attractive.js';

// Every template now renders **Typst** (each META carries `format: 'typst'`) and
// compiles via the Typst engine.
export const TEMPLATES = {
  jake: { meta: jakeMeta, render: renderJake },
  classic: { meta: classicMeta, render: renderClassic },
  minimalist: { meta: minimalistMeta, render: renderMinimalist },
  compact: { meta: compactMeta, render: renderCompact },
  executive: { meta: executiveMeta, render: renderExecutive, seed: executiveSeed },
  modern: { meta: modernMeta, render: renderModern, seed: modernSeed },
  alta: { meta: altaMeta, render: renderAlta },
  neat: { meta: neatMeta, render: renderNeat },
  deedy: { meta: deedyMeta, render: renderDeedy },
  attractive: { meta: attractiveMeta, render: renderAttractive },
};

// Deprecated alias: "uday" was renamed to "modern". Both ids map to the same
// renderer/seed so legacy callers keep working.
const ALIASES = { uday: 'modern' };
const resolve = (id) => ALIASES[id] || id;

export function listTemplates() {
  return Object.entries(TEMPLATES).map(([id, t]) => ({
    id,
    ...t.meta,
    hasSeed: Boolean(t.seed),
  }));
}

export function getSeed(id) {
  return TEMPLATES[resolve(id)]?.seed || null;
}

export function renderTemplate(id, resume, opts = {}) {
  const t = TEMPLATES[resolve(id)];
  if (!t) {
    const err = new Error(`Unknown template "${id}"`);
    err.status = 404;
    throw err;
  }
  return t.render(resume, opts);
}

// The engine a template renders for ('typst') — drives compile dispatch.
export function getFormat(id) {
  return TEMPLATES[resolve(id)]?.meta?.format || 'typst';
}
