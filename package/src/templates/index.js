import { renderJake, META as jakeMeta } from './jake.js';
import { renderModern, META as modernMeta } from './modern.js';
import { renderClassic, META as classicMeta } from './classic.js';
import { renderCompact, META as compactMeta } from './compact.js';
import { renderExecutive, META as executiveMeta, SEED_RESUME } from './executive.js';

export const TEMPLATES = {
  executive: { meta: executiveMeta, render: renderExecutive, seed: SEED_RESUME },
  jake: { meta: jakeMeta, render: renderJake },
  modern: { meta: modernMeta, render: renderModern },
  classic: { meta: classicMeta, render: renderClassic },
  compact: { meta: compactMeta, render: renderCompact },
};

export function listTemplates() {
  return Object.entries(TEMPLATES).map(([id, t]) => ({
    id,
    ...t.meta,
    hasSeed: Boolean(t.seed),
  }));
}

export function getSeed(id) {
  return TEMPLATES[id]?.seed || null;
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
