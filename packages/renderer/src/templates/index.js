import { renderJake, META as jakeMeta } from './jake.js';
import { renderClassic, META as classicMeta } from './classic.js';
import { renderCompact, META as compactMeta } from './compact.js';
import { renderUday, META as udayMeta, SEED_RESUME as udaySeed } from './uday.js';
import { renderExecutive, META as executiveMeta, SEED_RESUME as executiveSeed } from './executive.js';

// The template formerly called "uday" is now the app's "Modern" layout. The old
// generic accent-bar modern.js is retired (kept on disk but no longer registered).
const modernMeta = {
  ...udayMeta,
  name: 'Modern',
  description: 'Bold colored name with rule-separated sections — clean and contemporary.',
};

export const TEMPLATES = {
  jake: { meta: jakeMeta, render: renderJake },
  modern: { meta: modernMeta, render: renderUday, seed: udaySeed },
  classic: { meta: classicMeta, render: renderClassic },
  compact: { meta: compactMeta, render: renderCompact },
  executive: { meta: executiveMeta, render: renderExecutive, seed: executiveSeed },
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
