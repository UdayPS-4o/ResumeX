// resume-latex-renderer — turn a plain resume JSON object into a complete,
// compilable LaTeX document using one of several built-in templates.
//
// Pure functions only: no network, no filesystem, no LaTeX engine required.
// Pair the output with any LaTeX compiler (tectonic, pdflatex, latexonline…).
//
// This package is now a thin compatibility wrapper over the canonical
// @resumex/* packages — it preserves the original public API while delegating
// all behavior to @resumex/renderer (templates + LaTeX helpers) and
// @resumex/core (resume schema helpers).

import { TEMPLATES, listTemplates, getSeed, renderTemplate } from '@resumex/renderer';
import { tex, joinTex, hrefTex, dateRange, orderSections } from '@resumex/renderer/latex';
import { emptyResume, mergeResume, resumeJsonSchema } from '@resumex/core';

/**
 * Render a resume object to a LaTeX source string.
 *
 * @param {string} templateId  one of the ids from {@link listTemplates}
 * @param {object} resume      canonical resume JSON (see {@link emptyResume})
 * @param {object} [opts]       per-render options, e.g. { pageSize: 'a4' | 'letter' | 'legal' }
 * @returns {string} complete LaTeX document
 */
export function renderResume(templateId, resume, opts = {}) {
  return renderTemplate(templateId, resume || emptyResume(), opts);
}

/**
 * Get a single template's metadata + render fn, or undefined if unknown.
 * @param {string} id
 */
export function getTemplate(id) {
  const t = TEMPLATES[id];
  if (!t) return undefined;
  return { id, ...t.meta, hasSeed: Boolean(t.seed), render: t.render };
}

/** Map of templateId -> template definition (meta, render, optional seed). */
export { TEMPLATES };

/** List template metadata: [{ id, name, description, author, license, accent, hasSeed, ... }] */
export { listTemplates };

/** Sample/seed resume bundled with a template (e.g. the personal template), or null. */
export { getSeed };

/** Canonical empty resume factory + merge helper + JSON schema for LLM structured output. */
export { emptyResume, mergeResume, resumeJsonSchema };

/** Low-level LaTeX helpers, exported so custom templates can reuse them. */
export const latex = { tex, joinTex, hrefTex, dateRange, orderSections };

export default { renderResume, getTemplate, listTemplates, getSeed, TEMPLATES, emptyResume, mergeResume, resumeJsonSchema, latex };
