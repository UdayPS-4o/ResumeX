import { renderJake, META as jakeMeta } from './jake.js';
import { renderClassic, META as classicMeta } from './classic.js';
import { renderCompact, META as compactMeta } from './compact.js';
import { renderUday, META as udayMeta } from './uday.js';

// The template formerly called "uday" is now the app's "Modern" layout. The old
// generic accent-bar modern.js is retired (kept on disk but no longer registered).
const modernMeta = {
  ...udayMeta,
  name: 'Modern',
  description: 'Bold colored name with rule-separated sections — clean and contemporary.',
};

export const TEMPLATES = {
  jake: { meta: jakeMeta, render: renderJake },
  modern: { meta: modernMeta, render: renderUday },
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
  if (id === 'uday') id = 'modern'; // legacy alias
  return TEMPLATES[id]?.seed || null;
}

export function renderTemplate(id, resume, opts = {}) {
  if (id === 'uday') id = 'modern'; // legacy alias: "uday" was renamed to "modern"
  const t = TEMPLATES[id];
  if (!t) {
    const err = new Error(`Unknown template "${id}"`);
    err.status = 404;
    throw err;
  }
  return t.render(resume, opts);
}
