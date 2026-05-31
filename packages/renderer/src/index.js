// @resumex/renderer — single source of truth for resume templates (Typst engine).
export { renderTemplate, listTemplates, TEMPLATES, getFormat } from './templates/index.js';

// Re-export the generic structure helpers so consumers can import them from the
// package root.
export { DEFAULT_SECTION_TITLES, sectionTitle, orderSections } from './typst.js';

